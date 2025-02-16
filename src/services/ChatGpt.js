import Constants from 'expo-constants';

const OPENAI_API_KEY = Constants.expoConfig?.extra?.openaiApiKey;

const systemContent = `You are a Trivia Master. Your task is to provide a single, concise historical fact about a given location (latitude/longitude). The fact should be objective, informative, and similar in tone to an encyclopedia entry. It must be interesting and not widely known.

Response Formatting Rules:
Provide only the fact itself. Do not introduce or restate the location.
Use a neutral, factual tone. No opinions, humor, or unnecessary commentary.
Bold important keywords (names of people, places, unique terms), but DO NOT bold dates.
The response should be a single paragraph, informative yet concise.
Example Output (Raw Response Format):
✅ Correct Response (Keywords Bolded, Neutral & Factual)
In **1842**, President **Sam Houston** ordered the Texas government archives to be moved from **Austin** to **Houston** due to concerns over potential conflict with **Mexico**. In response, local residents, led by **Angelina Eberly**, seized a cannon and fired at the officials transporting the documents. This event became known as the **Archive War**.
✅ Correct Response (Mysterious & Unexplained, Keywords Bolded)
In **1950**, the **Dyatlov Pass incident** occurred when nine hikers mysteriously died in the **Ural Mountains**. Despite numerous investigations, the exact cause of their deaths remains unknown, with theories ranging from a **military cover-up** to **supernatural forces**.
`;

export const getChatGPTResponse = async (latitude, longitude, modifier) => {
  modifier = modifier ?? "fact";
  const prompt = `Give me a ${modifier} of latitude ${latitude} and longitude ${longitude}`;

  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: systemContent,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error fetching response:", error);
    throw error;
  }
};
