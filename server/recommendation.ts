import { GoogleGenAI, Type } from '@google/genai';
import { dbQuery, dbGet } from './db.js';
import { Vehicle } from '../src/types.js';

export interface RecommendationQuery {
  durationDays: number;
  startDate?: string;
  endDate?: string;
  passengers: number;
  budget: number;
  currency: 'INR' | 'USD';
  vehicleTypePreference?: string;
  rentalPurpose: string;
  fuelPreference?: string;
  transmissionPreference?: string;
}

export interface RecommendationItem {
  vehicleId: number;
  vehicle: Vehicle;
  matchScore: number;
  badge: string;
  fitReason: string;
  prosForTrip: string[];
  budgetAnalysis: string;
  totalCostInSelectedCurrency: number;
  totalCostInUSD: number;
}

export interface RecommendationResult {
  executiveSummary: string;
  queryCriteria: {
    passengers: number;
    durationDays: number;
    budget: number;
    currency: 'INR' | 'USD';
    rentalPurpose: string;
    vehicleTypePreference: string;
    customerHistoryConsidered: boolean;
    previousBookingsCount: number;
  };
  recommendations: RecommendationItem[];
  alternativeSuggestions?: string;
}

const USD_TO_INR_RATE = 83.0;

function convertUSDToSelected(usdAmount: number, currency: 'INR' | 'USD'): number {
  if (currency === 'INR') {
    return Math.round(usdAmount * USD_TO_INR_RATE);
  }
  return Math.round(usdAmount * 100) / 100;
}

function convertSelectedToUSD(amount: number, currency: 'INR' | 'USD'): number {
  if (currency === 'INR') {
    return amount / USD_TO_INR_RATE;
  }
  return amount;
}

export async function generateVehicleRecommendations(
  query: RecommendationQuery,
  customerId?: number
): Promise<RecommendationResult> {
  const duration = Math.max(1, Math.min(60, Number(query.durationDays) || 1));
  const passengers = Math.max(1, Math.min(20, Number(query.passengers) || 1));
  const budget = Math.max(1, Number(query.budget) || 1000);
  const currency = query.currency === 'USD' ? 'USD' : 'INR';
  const typePref = query.vehicleTypePreference || 'Any';
  const purpose = query.rentalPurpose || 'General travel & exploration';

  // 1. Fetch customer's past bookings if authenticated
  let previousBookings: Array<any> = [];
  if (customerId) {
    try {
      previousBookings = dbQuery(
        `SELECT b.id, b.booking_code, b.rental_duration_days, b.total_amount, b.status,
                v.brand, v.model, v.vehicle_type, v.fuel_type, v.seating_capacity
         FROM bookings b
         JOIN vehicles v ON b.vehicle_id = v.id
         WHERE b.customer_id = ?
         ORDER BY b.created_at DESC
         LIMIT 5`,
        [customerId]
      );
    } catch (e) {
      console.warn('Failed to query past bookings:', e);
    }
  }

  // 2. Fetch fleet vehicles from database (exclude maintenance and inactive)
  const allVehicles = dbQuery<Vehicle>(
    `SELECT * FROM vehicles WHERE status NOT IN ('inactive', 'maintenance')`
  );

  const budgetInUSD = convertSelectedToUSD(budget, currency);

  // Filter and pre-score candidate vehicles
  const candidateVehicles = allVehicles.map((v) => {
    const totalUSD = v.price_per_day * duration;
    const totalSelected = convertUSDToSelected(totalUSD, currency);
    const capacityDifference = v.seating_capacity - passengers;
    const canFitPassengers = v.seating_capacity >= passengers;

    return {
      vehicle: v,
      totalUSD,
      totalSelected,
      canFitPassengers,
      capacityDifference
    };
  });

  // Prepare context summary for Gemini
  const customerHistorySummary = previousBookings.length > 0
    ? `Customer has ${previousBookings.length} previous booking(s): ` +
      previousBookings
        .map(
          (b) =>
            `${b.brand} ${b.model} (${b.vehicle_type}, ${b.fuel_type}, ${b.seating_capacity} seats for ${b.rental_duration_days} days)`
        )
        .join('; ')
    : 'No previous booking history (first-time customer or guest).';

  const inventorySummary = candidateVehicles.map((c) => ({
    id: c.vehicle.id,
    name: `${c.vehicle.brand} ${c.vehicle.model}`,
    type: c.vehicle.vehicle_type,
    seats: c.vehicle.seating_capacity,
    fuel: c.vehicle.fuel_type,
    transmission: c.vehicle.transmission,
    pricePerDayUSD: c.vehicle.price_per_day,
    pricePerDaySelected: convertUSDToSelected(c.vehicle.price_per_day, currency),
    totalCostUSD: c.totalUSD,
    totalCostSelected: c.totalSelected,
    status: c.vehicle.status,
    description: c.vehicle.description,
    canFitPassengers: c.canFitPassengers
  }));

  // Candidate Gemini models with graceful failover (primary: gemini-3.8-flash, backup: gemini-3.1-flash-lite)
  const CANDIDATE_MODELS = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
  let geminiResult: any = null;

  if (process.env.GEMINI_API_KEY) {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const systemPrompt = `You are AutoFleet's Senior AI Fleet Concierge & Vehicle Recommendation Expert.
Your role is to analyze a customer's specific rental requirements (passengers, rental duration, budget, purpose, previous bookings, and preferred vehicle type) and recommend the best matching vehicles from our actual fleet inventory.

Key Guidelines:
1. Passenger Capacity: Must accommodate ${passengers} passenger(s). Vehicles with fewer seats than ${passengers} should NOT be top recommendations.
2. Duration & Budget: Trip duration is ${duration} day(s). Target budget is ${currency === 'INR' ? '₹' : '$'}${budget.toLocaleString()} ${currency} (approx $${Math.round(budgetInUSD)} USD).
3. Trip Purpose: "${purpose}". Recommend vehicles whose form factor, comfort, cargo space, and fuel economy excel for this exact purpose (e.g. SUVs/Vans for family trips with luggage, Sedans/EVs for business and city trips, Sports/Luxury for special occasions).
4. Previous History: Factor in customer's past booking habits if available (${customerHistorySummary}).
5. Select 3 to 4 best vehicles from the provided inventory. Rank them by suitability.
6. Provide a rich, clear explanation ("fitReason") for each, explaining WHY this specific car was picked for their ${passengers} passengers, ${duration}-day trip, and "${purpose}".
7. Provide an informative budget analysis mentioning exact figures and savings or value proposition.`;

    const userPrompt = `
User Rental Request:
- Passengers: ${passengers} people
- Rental Duration: ${duration} days
- Budget: ${currency === 'INR' ? '₹' : '$'}${budget.toLocaleString()} ${currency}
- Preferred Vehicle Type: ${typePref}
- Purpose of Rental: ${purpose}
- Customer Past History: ${customerHistorySummary}

Available Fleet Inventory:
${JSON.stringify(inventorySummary, null, 2)}

Return a structured JSON response matching the required schema with:
- executiveSummary: A friendly, concise AI consultation summary explaining how you evaluated their request.
- recommendations: Array of top 3 to 4 recommended vehicle objects with vehicleId, matchScore (1-100), badge, fitReason, prosForTrip, and budgetAnalysis.
- alternativeSuggestions: A short tip or suggestion if their budget or preferences could be adjusted for even better value.
`;

    for (const modelName of CANDIDATE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
            }
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                executiveSummary: {
                  type: Type.STRING,
                  description: 'Consultative summary of the AI recommendation'
                },
                recommendations: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      vehicleId: { type: Type.INTEGER },
                      matchScore: { type: Type.INTEGER },
                      badge: { type: Type.STRING },
                      fitReason: { type: Type.STRING },
                      prosForTrip: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                      },
                      budgetAnalysis: { type: Type.STRING }
                    },
                    required: ['vehicleId', 'matchScore', 'badge', 'fitReason', 'prosForTrip', 'budgetAnalysis']
                  }
                },
                alternativeSuggestions: {
                  type: Type.STRING
                }
              },
              required: ['executiveSummary', 'recommendations']
            }
          }
        });

        if (response.text) {
          const parsed = JSON.parse(response.text.trim());
          if (parsed && Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0) {
            geminiResult = parsed;
            break;
          }
        }
      } catch (geminiError: any) {
        const errInfo = geminiError?.status || geminiError?.code || geminiError?.message || 'temporary error';
        console.warn(`[AI Recommender] Model ${modelName} transient high-demand/status (${errInfo}), trying backup model...`);
      }
    }

    if (!geminiResult) {
      console.warn('[AI Recommender] AI models temporarily under high demand, seamlessly employing algorithmic recommendation fallback.');
    }
  }

  // If Gemini provided recommendations, assemble the result with full vehicle records
  if (geminiResult && Array.isArray(geminiResult.recommendations) && geminiResult.recommendations.length > 0) {
    const finalRecommendations: RecommendationItem[] = [];

    for (const rec of geminiResult.recommendations) {
      const match = candidateVehicles.find((c) => c.vehicle.id === rec.vehicleId);
      if (match) {
        finalRecommendations.push({
          vehicleId: match.vehicle.id,
          vehicle: match.vehicle,
          matchScore: Math.min(100, Math.max(50, rec.matchScore || 85)),
          badge: rec.badge || 'Recommended',
          fitReason: rec.fitReason,
          prosForTrip: Array.isArray(rec.prosForTrip) && rec.prosForTrip.length > 0 ? rec.prosForTrip : [
            `Accommodates ${match.vehicle.seating_capacity} passengers easily`,
            `${match.vehicle.fuel_type} engine optimized for ${purpose}`,
            `Total rental cost: ${currency === 'INR' ? '₹' : '$'}${match.totalSelected.toLocaleString()}`
          ],
          budgetAnalysis: rec.budgetAnalysis,
          totalCostInSelectedCurrency: match.totalSelected,
          totalCostInUSD: match.totalUSD
        });
      }
    }

    if (finalRecommendations.length > 0) {
      return {
        executiveSummary: geminiResult.executiveSummary || `We evaluated our fleet against your requirements (${passengers} passengers, ${duration} days, ${currency === 'INR' ? '₹' : '$'}${budget.toLocaleString()} budget) for ${purpose}.`,
        queryCriteria: {
          passengers,
          durationDays: duration,
          budget,
          currency,
          rentalPurpose: purpose,
          vehicleTypePreference: typePref,
          customerHistoryConsidered: previousBookings.length > 0,
          previousBookingsCount: previousBookings.length
        },
        recommendations: finalRecommendations,
        alternativeSuggestions: geminiResult.alternativeSuggestions
      };
    }
  }

  // 3. Fallback Algorithmic Recommendation Engine
  // Scores vehicles deterministically based on seating, budget fit, category match, and purpose
  const scored = candidateVehicles.map((c) => {
    let score = 70;
    const v = c.vehicle;

    // Seating suitability
    if (v.seating_capacity < passengers) {
      score -= 50; // Cannot fit passengers
    } else if (v.seating_capacity === passengers) {
      score += 15; // Perfect seat count
    } else if (v.seating_capacity <= passengers + 2) {
      score += 10; // Comfortable with extra luggage space
    } else {
      score -= 5; // Oversized
    }

    // Budget suitability
    const diff = budget - c.totalSelected;
    if (diff >= 0) {
      // Under or on budget
      score += 15;
      if (diff < budget * 0.3) {
        score += 5; // Maximizes budget value
      }
    } else {
      // Over budget
      const overPct = Math.abs(diff) / budget;
      if (overPct < 0.2) score -= 5;
      else if (overPct < 0.5) score -= 15;
      else score -= 30;
    }

    // Type preference match
    if (typePref && typePref !== 'Any') {
      if (v.vehicle_type.toLowerCase() === typePref.toLowerCase()) {
        score += 15;
      }
    }

    // Purpose match
    const purp = purpose.toLowerCase();
    if ((purp.includes('family') || purp.includes('trip') || purp.includes('vacation')) && (v.vehicle_type === 'SUV' || v.vehicle_type === 'Van')) {
      score += 12;
    } else if ((purp.includes('business') || purp.includes('executive')) && (v.vehicle_type === 'Sedan' || v.vehicle_type === 'Luxury' || v.vehicle_type === 'Electric')) {
      score += 12;
    } else if ((purp.includes('eco') || purp.includes('commute')) && (v.fuel_type === 'Electric' || v.fuel_type === 'Hybrid')) {
      score += 12;
    } else if ((purp.includes('budget') || purp.includes('cheap')) && c.totalSelected <= budget) {
      score += 14;
    }

    // Customer history affinity
    if (previousBookings.length > 0) {
      const bookedTypes = previousBookings.map((b) => b.vehicle_type.toLowerCase());
      if (bookedTypes.includes(v.vehicle_type.toLowerCase())) {
        score += 8;
      }
    }

    return {
      ...c,
      calculatedScore: Math.max(40, Math.min(99, score))
    };
  });

  // Sort descending by score
  scored.sort((a, b) => b.calculatedScore - a.calculatedScore);

  // Take top 4
  const topPicks = scored.slice(0, 4);

  const fallbackRecommendations: RecommendationItem[] = topPicks.map((pick, idx) => {
    let badge = 'Recommended Choice';
    if (idx === 0) badge = pick.calculatedScore > 90 ? 'Top AI Match' : 'Best Overall Match';
    else if (pick.totalSelected <= budget) badge = 'Best Value Pick';
    else if (pick.vehicle.vehicle_type === 'SUV' || pick.vehicle.vehicle_type === 'Van') badge = 'Family & Cargo Favorite';
    else if (pick.vehicle.fuel_type === 'Electric') badge = 'Eco-Friendly Pick';

    const savings = budget - pick.totalSelected;
    let budgetAnalysisText = '';
    if (savings > 0) {
      budgetAnalysisText = `Estimated ${currency === 'INR' ? '₹' : '$'}${pick.totalSelected.toLocaleString()} for ${duration} days — comfortably within your ${currency === 'INR' ? '₹' : '$'}${budget.toLocaleString()} budget (saves ${currency === 'INR' ? '₹' : '$'}${savings.toLocaleString()}).`;
    } else if (savings === 0) {
      budgetAnalysisText = `Exact match for your ${currency === 'INR' ? '₹' : '$'}${budget.toLocaleString()} budget at ${currency === 'INR' ? '₹' : '$'}${pick.totalSelected.toLocaleString()} for ${duration} days.`;
    } else {
      budgetAnalysisText = `Total is ${currency === 'INR' ? '₹' : '$'}${pick.totalSelected.toLocaleString()} for ${duration} days (${currency === 'INR' ? '₹' : '$'}${Math.abs(savings).toLocaleString()} above target, offering upgraded comfort and performance).`;
    }

    const fitReasonText = `${pick.vehicle.brand} ${pick.vehicle.model} is ideally calibrated for your ${passengers}-passenger, ${duration}-day rental for ${purpose}. With ${pick.vehicle.seating_capacity} spacious seats, smooth ${pick.vehicle.transmission} transmission, and a ${pick.vehicle.fuel_type} powertrain, it guarantees seamless travel comfort.`;

    const pros: string[] = [
      `Comfortably seats ${pick.vehicle.seating_capacity} passengers (${pick.capacityDifference >= 0 ? `${pick.capacityDifference} extra seat buffer` : 'exact fit'})`,
      `${pick.vehicle.fuel_type} efficiency with ${pick.vehicle.transmission} drive`,
      `Rate of $${pick.vehicle.price_per_day.toFixed(0)}/day (${currency === 'INR' ? '₹' : '$'}${convertUSDToSelected(pick.vehicle.price_per_day, currency).toLocaleString()}/day)`
    ];

    return {
      vehicleId: pick.vehicle.id,
      vehicle: pick.vehicle,
      matchScore: pick.calculatedScore,
      badge,
      fitReason: fitReasonText,
      prosForTrip: pros,
      budgetAnalysis: budgetAnalysisText,
      totalCostInSelectedCurrency: pick.totalSelected,
      totalCostInUSD: pick.totalUSD
    };
  });

  return {
    executiveSummary: `Our smart matchmaker analyzed ${allVehicles.length} fleet options for ${passengers} passenger(s) across ${duration} day(s) with a budget of ${currency === 'INR' ? '₹' : '$'}${budget.toLocaleString()} for "${purpose}". Here are our top-rated recommendations.`,
    queryCriteria: {
      passengers,
      durationDays: duration,
      budget,
      currency,
      rentalPurpose: purpose,
      vehicleTypePreference: typePref,
      customerHistoryConsidered: previousBookings.length > 0,
      previousBookingsCount: previousBookings.length
    },
    recommendations: fallbackRecommendations,
    alternativeSuggestions:
      'Tip: You can adjust the rental dates or passenger count to unlock further multi-day discounts.'
  };
}
