export async function handler(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    // Handle CORS preflight request
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // <-- use specific origin here later if needed
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  try {
    const { query } = JSON.parse(event.body);

    const prompt = `You are a Google Sheets formula expert. Convert this plain English request into a Google Sheets formula:

"${query}"

Respond with a JSON object containing:
- "formula": The exact Google Sheets formula (including = sign)
- "explanation": A brief explanation of what the formula does

Important:
- Do not include any extra text before or after the JSON object.
- The response should be a single-line JSON string.
- No Markdown formatting, no explanation outside the JSON.

Examples:
- "sum all values in column B where column C is greater than 50" → {"formula": "=SUMIF(C:C,\">50\",B:B)", "explanation": "This formula sums all values in column B where the corresponding value in column C is greater than 50"}
- "average of A1 to A10" → {"formula": "=AVERAGE(A1:A10)", "explanation": "This formula calculates the average of cells A1 through A10"}
- "count cells in column D that contain text" → {"formula": "=COUNTA(D:D)", "explanation": "This formula counts all non-empty cells in column D"}
`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.1,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      return {
        statusCode: openaiResponse.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: errorData.error?.message || 'OpenAI API request failed' }),
      };
    }

    const data = await openaiResponse.json();
    const content = data.choices[0].message.content.trim();

    let jsonResponse;
    try {
      jsonResponse = JSON.parse(content);
    } catch {
      jsonResponse = {
        formula: content,
        explanation: 'Formula generated successfully (fallback mode)',
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(jsonResponse),
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}
