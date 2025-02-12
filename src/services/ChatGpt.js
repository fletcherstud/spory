import { OPENAI_API_KEY } from "@env";

const systemContent = `Provide a fact based on a given latitude and longitude. The response should be factual, objective, and concise, similar to an encyclopedia entry. The fact should be interesting and not obvious.

# Output Rules

- **DO NOT** introduce the location with phrases like "The location you've given is..." or restate the location name before the fact.
- **DO** provide only the fact itself.
- **DO NOT** add commentary, opinions, or attempt humor.
- **DO** include relevant dates (year minimum) when applicable.
- **DO NOT** use casual or conversational language.
- The response should be concise but informative.
= **DO NOT** include any latitude or longitude coordinates.


# Output Format

A single paragraph containing a factual historical event or detail about the given location.

# Examples

✅ **Correct Response (Neutral & Factual)**  
"In 1842, President Sam Houston ordered the Texas government archives to be moved from Austin to Houston due to concerns over potential conflict with Mexico. In response, local residents, led by Angelina Eberly, seized a cannon and fired at the officials transporting the documents. This event became known as the Archive War."

❌ **Incorrect Response (Too Conversational & Personality-Driven)**  
"In the 1800s, Austin almost lost its government records in what became the Archive War! When Sam Houston tried to move the Texas archives, an angry group of residents—led by Angelina Eberly—literally fired a cannon to stop them. It was a dramatic moment that ensured Austin remained the state capital."

✅ **Correct Response (Mysterious & Unexplained)**  
"In 1950, the Dyatlov Pass incident occurred when nine hikers mysteriously died in the Ural Mountains. Despite numerous investigations, the exact cause of their deaths remains unknown, with theories ranging from a military cover-up to supernatural forces."

❌ **Incorrect Response (Not Mysterious)**  
"In 1969, humans landed on the Moon for the first time. This historic event was made possible through the Apollo 11 mission."

# Notes

- Ensure facts are accurate. 
- Use facts that are less well known.
- The response should be purely informational, similar to a Wikipedia entry.
- All names should include the first and last name.
- Do **not** attempt to make the fact humorous, or dramatic.`;

export const getChatGPTResponse = async (latitude, longitude, modifier) => {
  modifier = modifier ?? "fact";
  const prompt = `Give me a ${modifier} of latitude ${latitude} and longitude ${longitude}`;

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
