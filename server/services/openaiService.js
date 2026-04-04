const OpenAI = require('openai');

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-')
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * AI Chat service for wellness and fitness guidance
 */
class OpenAIService {
  constructor() {
    this.isAvailable = !!openai;
  }

  /**
   * Get AI response for chat messages
   * @param {string} message - User message
   * @param {Object} context - Context about the client/professional
   * @returns {Promise<Object>} AI response
   */
  async getChatResponse(message, context = {}) {
    if (!this.isAvailable) {
      return this.getFallbackResponse(message);
    }

    try {
      const systemPrompt = `You are Aura, an AI assistant for wellness and fitness professionals. 
You provide helpful, evidence-based advice on:
- Fitness and exercise programming
- Nutrition guidance and meal planning
- Client motivation and retention strategies
- Business operations for wellness professionals
- Health and wellness best practices

Keep responses concise (2-3 sentences max), professional, and encouraging.
If asked about medical conditions, always advise consulting a healthcare professional.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ];

      // Add context if available
      if (context.clientName) {
        messages.splice(1, 0, {
          role: 'system',
          content: `Current client: ${context.clientName}. Goals: ${context.goals || 'Not specified'}.`
        });
      }

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: 200,
        temperature: 0.7
      });

      return {
        message: completion.choices[0].message.content,
        timestamp: new Date().toISOString(),
        model: 'gpt-3.5-turbo',
        tokens: completion.usage?.total_tokens
      };
    } catch (error) {
      console.error('OpenAI API error:', error.message);
      return this.getFallbackResponse(message);
    }
  }

  /**
   * Generate workout program based on client profile
   * @param {Object} clientProfile - Client information
   * @returns {Promise<Object>} Generated workout program
   */
  async generateWorkoutProgram(clientProfile) {
    if (!this.isAvailable) {
      return this.getFallbackProgram(clientProfile);
    }

    try {
      const prompt = `Create a personalized workout program for:
- Name: ${clientProfile.name}
- Fitness Level: ${clientProfile.fitnessLevel}
- Goals: ${clientProfile.goals}
- Available Time: ${clientProfile.timePerSession || '45 minutes'} per session
- Frequency: ${clientProfile.frequency || '3 days per week'}

Return ONLY a JSON object with this structure:
{
  "name": "Program name",
  "description": "Brief description",
  "duration": "number of weeks",
  "sessions": [
    {
      "day": "Day 1",
      "focus": "Focus area",
      "exercises": [
        {"name": "Exercise name", "sets": 3, "reps": "10-12", "rest": "60s"}
      ]
    }
  ]
}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a certified personal trainer. Create safe, effective workout programs.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.7
      });

      const content = completion.choices[0].message.content;
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return this.getFallbackProgram(clientProfile);
    } catch (error) {
      console.error('OpenAI program generation error:', error.message);
      return this.getFallbackProgram(clientProfile);
    }
  }

  /**
   * Generate nutrition advice
   * @param {Object} params - Nutrition parameters
   * @returns {Promise<Object>} Nutrition recommendations
   */
  async generateNutritionAdvice(params) {
    if (!this.isAvailable) {
      return this.getFallbackNutrition(params);
    }

    try {
      const prompt = `Provide nutrition guidance for:
- Goal: ${params.goal}
- Dietary Preferences: ${params.preferences || 'None'}
- Allergies: ${params.allergies || 'None'}
- Activity Level: ${params.activityLevel || 'Moderate'}

Return a concise meal plan with calories and macros.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a nutritionist. Provide practical, healthy eating advice.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      return {
        advice: completion.choices[0].message.content,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('OpenAI nutrition error:', error.message);
      return this.getFallbackNutrition(params);
    }
  }

  /**
   * Analyze client progress and provide insights
   * @param {Array} progressData - Historical progress data
   * @returns {Promise<Object>} Insights and recommendations
   */
  async analyzeProgress(progressData) {
    if (!this.isAvailable || progressData.length < 2) {
      return this.getFallbackProgressAnalysis(progressData);
    }

    try {
      const dataSummary = progressData.slice(-10).map(p => 
        `Date: ${p.date}, Weight: ${p.weight}, Body Fat: ${p.bodyFat}%`
      ).join('\n');

      const prompt = `Analyze this client's progress data and provide insights:
${dataSummary}

Provide:
1. A brief trend analysis
2. 2-3 recommendations for improvement
3. Positive reinforcement`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a supportive fitness coach analyzing client progress.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 300,
        temperature: 0.7
      });

      return {
        analysis: completion.choices[0].message.content,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('OpenAI progress analysis error:', error.message);
      return this.getFallbackProgressAnalysis(progressData);
    }
  }

  // Fallback responses when OpenAI is not available
  getFallbackResponse(message) {
    const responses = [
      "That's a great question! For pre-workout nutrition, focus on easily digestible carbs like bananas or oatmeal 30-60 minutes before exercise.",
      "I recommend staying hydrated! Drink at least 8 glasses of water daily, and more on training days.",
      "For muscle recovery, prioritize protein intake within 30 minutes after your workout. Aim for 20-30g of quality protein.",
      "Consistency is key! Aim for at least 150 minutes of moderate activity per week, spread across multiple days.",
      "Progressive overload is essential for strength gains. Try increasing weight by 2.5-5% when you can complete all sets comfortably.",
      "Sleep is crucial for recovery! Aim for 7-9 hours of quality sleep per night to maximize your fitness results."
    ];
    
    const lowerMessage = message.toLowerCase();
    let response;
    
    if (lowerMessage.includes('nutrition') || lowerMessage.includes('eat') || lowerMessage.includes('food')) {
      response = responses[0];
    } else if (lowerMessage.includes('water') || lowerMessage.includes('hydration')) {
      response = responses[1];
    } else if (lowerMessage.includes('recover') || lowerMessage.includes('protein')) {
      response = responses[2];
    } else if (lowerMessage.includes('schedule') || lowerMessage.includes('how often')) {
      response = responses[3];
    } else if (lowerMessage.includes('strength') || lowerMessage.includes('weight')) {
      response = responses[4];
    } else if (lowerMessage.includes('sleep')) {
      response = responses[5];
    } else {
      response = responses[Math.floor(Math.random() * responses.length)];
    }

    return {
      message: response,
      timestamp: new Date().toISOString(),
      model: 'fallback',
      note: 'OpenAI API not configured. Set OPENAI_API_KEY for enhanced AI responses.'
    };
  }

  getFallbackProgram(clientProfile) {
    const level = clientProfile.fitnessLevel || 'beginner';
    
    const programs = {
      beginner: {
        name: 'Beginner Foundation Program',
        description: 'A 4-week program to build foundational strength and fitness habits',
        duration: 4,
        sessions: [
          {
            day: 'Day 1 - Full Body',
            focus: 'Compound movements and form mastery',
            exercises: [
              { name: 'Bodyweight Squats', sets: 3, reps: '12-15', rest: '60s' },
              { name: 'Push-ups (or Modified)', sets: 3, reps: '8-12', rest: '60s' },
              { name: 'Glute Bridges', sets: 3, reps: '15', rest: '45s' },
              { name: 'Plank Hold', sets: 3, reps: '20-30 sec', rest: '45s' }
            ]
          },
          {
            day: 'Day 2 - Cardio & Core',
            focus: 'Cardiovascular health and core stability',
            exercises: [
              { name: 'Brisk Walking/Jogging', sets: 1, reps: '20 min', rest: 'N/A' },
              { name: 'Dead Bug', sets: 3, reps: '10 each side', rest: '30s' },
              { name: 'Bird Dog', sets: 3, reps: '10 each side', rest: '30s' }
            ]
          },
          {
            day: 'Day 3 - Full Body',
            focus: 'Building on Day 1 with slight progression',
            exercises: [
              { name: 'Goblet Squats (light weight)', sets: 3, reps: '10-12', rest: '60s' },
              { name: 'Incline Push-ups', sets: 3, reps: '10-15', rest: '60s' },
              { name: 'Dumbbell Rows', sets: 3, reps: '12 each arm', rest: '45s' },
              { name: 'Glute Bridges (single leg)', sets: 3, reps: '10 each', rest: '45s' }
            ]
          }
        ]
      },
      intermediate: {
        name: 'Intermediate Strength Builder',
        description: 'A 6-week program focused on strength progression',
        duration: 6,
        sessions: [
          {
            day: 'Day 1 - Lower Body',
            focus: 'Leg strength and power',
            exercises: [
              { name: 'Barbell Squats', sets: 4, reps: '8-10', rest: '90s' },
              { name: 'Romanian Deadlifts', sets: 4, reps: '10-12', rest: '90s' },
              { name: 'Walking Lunges', sets: 3, reps: '12 each', rest: '60s' },
              { name: 'Calf Raises', sets: 4, reps: '15', rest: '45s' }
            ]
          },
          {
            day: 'Day 2 - Upper Body Push',
            focus: 'Chest, shoulders, and triceps',
            exercises: [
              { name: 'Bench Press', sets: 4, reps: '8-10', rest: '90s' },
              { name: 'Overhead Press', sets: 4, reps: '8-10', rest: '90s' },
              { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', rest: '60s' },
              { name: 'Tricep Dips', sets: 3, reps: '12-15', rest: '45s' }
            ]
          },
          {
            day: 'Day 3 - Upper Body Pull',
            focus: 'Back and biceps',
            exercises: [
              { name: 'Pull-ups or Lat Pulldown', sets: 4, reps: '8-10', rest: '90s' },
              { name: 'Barbell Rows', sets: 4, reps: '10', rest: '90s' },
              { name: 'Face Pulls', sets: 3, reps: '15', rest: '45s' },
              { name: 'Barbell Curls', sets: 3, reps: '12', rest: '45s' }
            ]
          }
        ]
      },
      advanced: {
        name: 'Advanced Hypertrophy Protocol',
        description: 'An 8-week program for experienced lifters focusing on muscle growth',
        duration: 8,
        sessions: [
          {
            day: 'Day 1 - Chest & Back',
            focus: 'Horizontal pushing and pulling',
            exercises: [
              { name: 'Barbell Bench Press', sets: 5, reps: '6-8', rest: '120s' },
              { name: 'Weighted Pull-ups', sets: 4, reps: '8-10', rest: '90s' },
              { name: 'Incline Dumbbell Flyes', sets: 4, reps: '12-15', rest: '60s' },
              { name: 'Chest-Supported Rows', sets: 4, reps: '10-12', rest: '60s' }
            ]
          },
          {
            day: 'Day 2 - Legs',
            focus: 'Quad and hamstring development',
            exercises: [
              { name: 'Front Squats', sets: 5, reps: '6-8', rest: '120s' },
              { name: 'Leg Press', sets: 4, reps: '10-12', rest: '90s' },
              { name: 'Lying Leg Curls', sets: 4, reps: '12-15', rest: '60s' },
              { name: 'Bulgarian Split Squats', sets: 3, reps: '10 each', rest: '60s' }
            ]
          },
          {
            day: 'Day 3 - Shoulders & Arms',
            focus: 'Delts, biceps, and triceps',
            exercises: [
              { name: 'Overhead Press', sets: 5, reps: '6-8', rest: '120s' },
              { name: 'Lateral Raises', sets: 4, reps: '15', rest: '45s' },
              { name: 'Close-Grip Bench', sets: 4, reps: '8-10', rest: '60s' },
              { name: 'Incline Dumbbell Curls', sets: 4, reps: '12', rest: '45s' }
            ]
          }
        ]
      }
    };

    return programs[level] || programs.beginner;
  }

  getFallbackNutrition(params) {
    const goal = params.goal || 'maintenance';
    
    const plans = {
      weight_loss: {
        advice: `## Weight Loss Nutrition Plan

**Daily Targets:**
- Calories: 500 below maintenance
- Protein: 1.6-2.0g per kg bodyweight
- Carbs: Focus on complex carbs, vegetables
- Fats: 20-30% of total calories

**Sample Day:**
- Breakfast: Oatmeal with berries and protein powder
- Lunch: Grilled chicken salad with quinoa
- Snack: Greek yogurt with almonds
- Dinner: Salmon with roasted vegetables

**Tips:**
- Eat slowly and mindfully
- Drink water before meals
- Prioritize protein at each meal`,
        timestamp: new Date().toISOString()
      },
      muscle_gain: {
        advice: `## Muscle Building Nutrition Plan

**Daily Targets:**
- Calories: 300-500 above maintenance
- Protein: 1.8-2.2g per kg bodyweight
- Carbs: Higher around workouts
- Fats: 25-35% of total calories

**Sample Day:**
- Breakfast: Eggs, oatmeal, and banana
- Lunch: Chicken breast, rice, and vegetables
- Pre-workout: Rice cakes with honey
- Post-workout: Protein shake with carbs
- Dinner: Steak, sweet potato, and greens

**Tips:**
- Eat protein every 3-4 hours
- Don't skip post-workout nutrition
- Track your progress weekly`,
        timestamp: new Date().toISOString()
      },
      maintenance: {
        advice: `## Maintenance Nutrition Plan

**Daily Targets:**
- Calories: At maintenance level
- Protein: 1.4-1.8g per kg bodyweight
- Carbs: Balanced throughout the day
- Fats: 25-35% of total calories

**Sample Day:**
- Breakfast: Scrambled eggs with whole grain toast
- Lunch: Turkey wrap with vegetables
- Snack: Apple with peanut butter
- Dinner: Grilled fish with brown rice and salad

**Tips:**
- Focus on whole foods
- Stay hydrated
- Listen to hunger cues`,
        timestamp: new Date().toISOString()
      }
    };

    return plans[goal] || plans.maintenance;
  }

  getFallbackProgressAnalysis(progressData) {
    if (!progressData || progressData.length === 0) {
      return {
        analysis: "Not enough data to analyze progress yet. Keep tracking your measurements regularly!",
        timestamp: new Date().toISOString()
      };
    }

    const latest = progressData[progressData.length - 1];
    const first = progressData[0];
    
    let trend = 'stable';
    if (latest.weight < first.weight - 1) trend = 'weight loss';
    if (latest.weight > first.weight + 1) trend = 'weight gain';

    return {
      analysis: `## Progress Analysis

**Overall Trend:** ${trend === 'weight loss' ? '✅ Weight loss progress detected!' : trend === 'weight gain' ? '📈 Weight gain trend observed' : '➡️ Weight is stable'}

**Recommendations:**
1. Continue with your current program - consistency is paying off
2. Take progress photos to track visual changes
3. Consider adjusting calories if progress stalls for 2+ weeks
4. Keep tracking measurements beyond just weight

**Positive Reinforcement:**
Great job staying consistent with your tracking! Every data point helps us optimize your program.`,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new OpenAIService();
