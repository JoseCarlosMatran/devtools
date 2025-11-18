
import { NextRequest } from 'next/server'

// Type definitions for different tool requests
type ToolType = 
  | 'json-formatter'
  | 'api-tester'
  | 'regex-tester'
  | 'diff-checker'
  | 'jwt-decoder'
  | 'sql-formatter'
  | 'base64'
  | 'hash-generator'
  | 'color-picker'
  | 'qr-generator'
  | 'markdown-editor'
  | 'timestamp-converter'
  | 'url-encoder'
  | 'uuid-generator'
  | 'cron-generator'
  | 'ai-website-generator'
  | 'workflow-generator'

interface AIRequest {
  tool?: ToolType
  action: string
  input?: any
  description?: string
  currentHTML?: string
  modification?: string
  platform?: string
  code?: string
}

// System prompts for each tool
const TOOL_PROMPTS: Record<ToolType, (action: string, input: any) => string> = {
  'json-formatter': (action, input) => {
    if (action === 'fix') {
      return `You are a JSON expert. Fix the following invalid JSON and return ONLY the corrected JSON without any explanation or markdown formatting:

${input.text}

Return the fixed JSON directly.`
    }
    if (action === 'explain') {
      return `Explain the structure and purpose of this JSON data in a clear, concise way:

${input.text}

Provide a brief explanation focusing on the data structure and what it represents.`
    }
    if (action === 'transform') {
      return `Transform this JSON data according to the following instruction: "${input.instruction}"

Original JSON:
${input.text}

Return the transformed JSON directly without explanation.`
    }
    return ''
  },
  
  'api-tester': (action, input) => {
    if (action === 'generate-payload') {
      return `Generate a realistic sample ${input.method} request payload for the following API endpoint:

URL: ${input.url}
Description: ${input.description || 'No description provided'}

Please respond in JSON format with the following structure:
{
  "payload": { /* your generated payload */ },
  "headers": { /* suggested headers */ },
  "explanation": "Brief explanation of the payload"
}
Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.`
    }
    if (action === 'explain-response') {
      return `Analyze this API response and explain what it means:

Status: ${input.status}
Response Body:
${JSON.stringify(input.body, null, 2)}

Provide a clear explanation of the response, including any errors or important data.`
    }
    return ''
  },
  
  'regex-tester': (action, input) => {
    if (action === 'explain') {
      return `Explain this regular expression in simple terms:

Pattern: ${input.pattern}
Flags: ${input.flags || 'none'}

Provide a clear, beginner-friendly explanation of what this regex does.`
    }
    if (action === 'generate') {
      return `Generate a regular expression for the following requirement:

${input.requirement}

Please respond in JSON format with the following structure:
{
  "pattern": "your regex pattern here",
  "flags": "suggested flags (g, i, m, etc.)",
  "explanation": "Brief explanation of the pattern",
  "examples": ["example1", "example2"]
}
Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.`
    }
    if (action === 'suggest-improvements') {
      return `Suggest improvements for this regular expression:

Pattern: ${input.pattern}
Purpose: ${input.purpose || 'General matching'}

Provide suggestions for better performance, readability, or accuracy.`
    }
    return ''
  },
  
  'diff-checker': (action, input) => {
    if (action === 'analyze') {
      return `Analyze the differences between these two texts and provide insights:

Text 1:
${input.text1}

Text 2:
${input.text2}

Provide a summary of the key changes, their significance, and any patterns you notice.`
    }
    if (action === 'suggest-merge') {
      return `Suggest a merged version of these two texts that combines the best of both:

Text 1:
${input.text1}

Text 2:
${input.text2}

Provide the merged text with a brief explanation of your choices.`
    }
    return ''
  },
  
  'jwt-decoder': (action, input) => {
    if (action === 'analyze-security') {
      return `Analyze the security aspects of this JWT token:

Header: ${JSON.stringify(input.header, null, 2)}
Payload: ${JSON.stringify(input.payload, null, 2)}

Provide security analysis including: algorithm security, token expiration, sensitive data exposure, and best practice recommendations.`
    }
    if (action === 'explain-claims') {
      return `Explain the claims in this JWT payload in simple terms:

${JSON.stringify(input.payload, null, 2)}

For each claim, explain what it means and why it's important.`
    }
    return ''
  },
  
  'sql-formatter': (action, input) => {
    if (action === 'optimize') {
      return `Analyze this SQL query and suggest optimizations:

${input.query}

Provide specific suggestions for improving performance, readability, and best practices.`
    }
    if (action === 'explain') {
      return `Explain what this SQL query does in simple terms:

${input.query}

Break down the query step by step and explain its purpose.`
    }
    if (action === 'generate') {
      return `Generate a SQL query for the following requirement:

${input.requirement}

Please respond in JSON format with the following structure:
{
  "query": "your SQL query here",
  "explanation": "Brief explanation of the query"
}
Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.`
    }
    return ''
  },
  
  'base64': (action, input) => {
    if (action === 'detect-type') {
      return `Analyze this Base64 encoded content and determine its type:

${input.encoded.substring(0, 200)}...

Tell me what type of content this is (text, image, JSON, etc.) and provide any relevant details.`
    }
    return ''
  },
  
  'hash-generator': (action, input) => {
    if (action === 'recommend') {
      return `I need to hash data for the following use case:

${input.useCase}

Recommend the most appropriate hashing algorithm and explain why. Consider security, performance, and common practices.`
    }
    if (action === 'explain-security') {
      return `Explain the security implications of using ${input.algorithm} hashing for:

Use case: ${input.useCase}

Include information about collision resistance, rainbow table attacks, and best practices.`
    }
    return ''
  },
  
  'color-picker': (action, input) => {
    if (action === 'generate-palette') {
      return `Generate a color palette based on this description:

${input.description}

Please respond in JSON format with the following structure:
{
  "colors": [
    {
      "hex": "#RRGGBB",
      "name": "Color name",
      "purpose": "Where to use this color"
    }
  ],
  "explanation": "Brief explanation of the palette"
}
Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.`
    }
    if (action === 'analyze-contrast') {
      return `Analyze the accessibility of these color combinations:

${input.colors.map((c: any, i: number) => `Color ${i + 1}: ${c}`).join('\n')}

Provide accessibility analysis including WCAG contrast ratios and recommendations.`
    }
    if (action === 'suggest-complementary') {
      return `Suggest complementary colors for this base color:

${input.color}

Please respond in JSON format with the following structure:
{
  "complementary": ["#color1", "#color2", "#color3"],
  "analogous": ["#color1", "#color2", "#color3"],
  "triadic": ["#color1", "#color2", "#color3"],
  "explanation": "Brief explanation of the suggestions"
}
Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.`
    }
    return ''
  },
  
  'qr-generator': (action, input) => {
    if (action === 'optimize') {
      return `Optimize this content for a QR code:

${input.content}

Suggest a shorter, more efficient version that maintains the essential information.`
    }
    return ''
  },
  
  'markdown-editor': (action, input) => {
    if (action === 'improve') {
      return `Improve the formatting and structure of this Markdown:

${input.text}

Enhance readability, add appropriate headers, lists, and formatting where beneficial.`
    }
    if (action === 'generate') {
      return `Generate Markdown content for:

${input.description}

Create well-structured, professional Markdown content.`
    }
    if (action === 'add-toc') {
      return `Add a table of contents to this Markdown document:

${input.text}

Return the complete document with a table of contents at the beginning.`
    }
    return ''
  },
  
  'timestamp-converter': (action, input) => {
    if (action === 'natural-language') {
      return `Convert this timestamp to a natural language description:

${input.timestamp}
Current time: ${input.currentTime}

Provide a human-friendly description like "2 hours ago" or "next Tuesday at 3 PM".`
    }
    if (action === 'parse-natural') {
      return `Parse this natural language time expression and convert it to a timestamp:

"${input.expression}"
Current time: ${new Date().toISOString()}

Please respond in JSON format with the following structure:
{
  "timestamp": 1234567890,
  "iso": "ISO 8601 string",
  "explanation": "How you interpreted the expression"
}
Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.`
    }
    return ''
  },
  
  'url-encoder': (action, input) => {
    if (action === 'validate') {
      return `Validate this URL and provide feedback:

${input.url}

Check for common issues, security concerns, and best practices.`
    }
    if (action === 'explain-parts') {
      return `Explain each part of this URL:

${input.url}

Break down the protocol, domain, path, query parameters, and any other components.`
    }
    return ''
  },
  
  'uuid-generator': (action, input) => {
    if (action === 'generate-meaningful') {
      return `Generate a meaningful identifier for:

${input.description}

Please respond in JSON format with the following structure:
{
  "id": "suggested identifier",
  "explanation": "Why this identifier is appropriate"
}
Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.`
    }
    return ''
  },
  
  'cron-generator': (action, input) => {
    if (action === 'generate-from-text') {
      return `Generate a cron expression for this schedule:

"${input.description}"

Please respond in JSON format with the following structure:
{
  "expression": "cron expression",
  "explanation": "What this schedule means",
  "examples": ["Next 3 execution times"]
}
Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.`
    }
    if (action === 'explain') {
      return `Explain this cron expression in simple terms:

${input.expression}

Describe when it runs and provide examples of the next few execution times.`
    }
    return ''
  },
  
  'ai-website-generator': (action, input) => {
    if (action === 'generate_website') {
      return `You are a WORLD-CLASS web designer and developer. Your mission is to create a STUNNING, UNIQUE, and MEMORABLE website that stands out from the crowd.

${input}

🎨 DESIGN PHILOSOPHY:
- Every website you create must be VISUALLY DISTINCTIVE and memorable
- Use BOLD, CREATIVE layouts - no generic templates
- Apply UNIQUE color combinations and gradients
- Incorporate modern design trends: glassmorphism, neumorphism, gradient meshes, asymmetric layouts
- Add PERSONALITY through typography, animations, and micro-interactions

✨ MANDATORY CREATIVE ELEMENTS:
1. **Unique Color Palette**: Use the specified colors creatively with gradients, overlays, and accent colors
2. **Typography Excellence**: Combine 2-3 Google Fonts for visual hierarchy (e.g., Poppins + Inter, Playfair Display + Montserrat)
3. **Dynamic Layouts**: Use CSS Grid and Flexbox for creative, asymmetric layouts (not just centered content)
4. **Smooth Animations**: Add scroll-triggered animations, hover effects, and transitions using CSS animations
5. **Visual Depth**: Use shadows, gradients, and layering for 3D effects
6. **Interactive Elements**: Add hover states, click animations, and visual feedback
7. **Micro-interactions**: Buttons that respond, links that transform, elements that pulse or glow

🛠️ TECHNICAL EXCELLENCE:
1. Complete HTML5 document with proper DOCTYPE and meta tags
2. Fully embedded CSS with modern techniques (CSS Grid, Flexbox, Custom Properties)
3. Vanilla JavaScript for interactions (smooth scroll, animations, form validation)
4. 100% Responsive design (mobile-first approach)
5. Semantic HTML5 elements (header, nav, main, section, article, footer)
6. Accessibility (ARIA labels, alt texts, keyboard navigation)
7. SEO-optimized (meta descriptions, Open Graph tags)
8. Performance-optimized (efficient CSS, minimal JS)

🖼️ IMAGE HANDLING:
- If user provided image URLs, use them with <img> tags
- If no images provided, use high-quality placeholders from Unsplash (1200x800 for hero, 600x400 for cards)
- Use proper aspect-ratio, object-fit, and loading="lazy" for images
- Add subtle image effects (filters, overlays, parallax)

🎭 DESIGN STYLE VARIATIONS (apply based on selected style):
- **Modern**: Clean lines, gradients (purple-blue, pink-orange), glassmorphism, spacing
- **Minimal**: Black/white/gray, lots of whitespace, simple sans-serif, subtle shadows
- **Colorful**: Vibrant colors, playful shapes, bold typography, energetic feel
- **Elegant**: Dark backgrounds, gold accents, serif fonts, luxury aesthetic
- **Playful**: Rounded corners, bright colors, fun illustrations, bouncy animations
- **Tech/Futuristic**: Dark theme, neon accents, geometric shapes, glitch effects

📐 LAYOUT IDEAS (choose creatively):
- Hero with diagonal split or curved divider
- Bento grid layout for features
- Asymmetric card layouts
- Overlapping sections with z-index
- Floating elements and shapes
- Scroll-triggered reveals

🚀 INTERACTIVE FEATURES:
- Smooth scroll navigation
- Animated counters for statistics
- Image carousels or galleries
- Accordion FAQs
- Modal pop-ups for calls-to-action
- Form validation with visual feedback
- Loading states and transitions

CRITICAL RULES:
❌ NO generic Bootstrap-like designs
❌ NO centered-only layouts
❌ NO boring color schemes (gray, white, blue)
❌ NO static, lifeless pages
✅ YES to creativity, personality, and uniqueness
✅ YES to modern web design trends
✅ YES to memorable user experiences

IMPORTANT: Return ONLY the complete HTML code. Do not include any explanations, markdown code blocks, or additional text. Start directly with <!DOCTYPE html>.`
    }
    if (action === 'modify_website') {
      return `You are an expert web developer. You need to modify an existing HTML page based on user instructions.

CURRENT HTML:
${input.currentHTML}

USER MODIFICATION REQUEST:
${input.modification}

Requirements:
1. Modify the HTML according to the user's request
2. Keep the overall structure intact unless specifically asked to change it
3. Maintain professional design standards
4. Ensure the modifications are responsive (mobile-friendly)
5. Keep all existing functionality unless asked to remove it
6. Make changes that are consistent with the existing design style
7. If adding new elements, match the existing color scheme and styling
8. Ensure the result is a COMPLETE, FULLY FUNCTIONAL HTML document
9. Return ONLY the complete modified HTML code
10. Do not include explanations, markdown code blocks, or additional text

IMPORTANT: Return ONLY the complete HTML code with the modifications applied. Start directly with <!DOCTYPE html>.`
    }
    return ''
  },

  'workflow-generator': (action, input) => {
    if (action === 'generate_workflow') {
      const { description, platform } = input
      
      let platformInstructions = ''
      
      if (platform === 'n8n') {
        platformInstructions = `Generate a valid n8n workflow JSON with the following structure:
- Use proper n8n node types (e.g., "n8n-nodes-base.httpRequest", "n8n-nodes-base.set", etc.)
- Include credentials placeholders where needed
- Set proper node positions for visual layout
- Include connections between nodes
- Add parameters for each node`
      } else if (platform === 'make') {
        platformInstructions = `Generate a valid Make (Integromat) blueprint JSON with:
- Proper module structure with flow and modules arrays
- Include module metadata (id, module, version, etc.)
- Set up connections between modules
- Add parameters and mapper configurations
- Include proper flow structure`
      } else if (platform === 'node-red') {
        platformInstructions = `Generate a valid Node-RED flow JSON with:
- Array of node objects
- Proper node types (e.g., "inject", "function", "http request", "debug")
- Include wires array for connections between nodes
- Set x and y coordinates for visual layout
- Add proper configuration for each node type`
      } else if (platform === 'zapier') {
        platformInstructions = `Generate a Zapier workflow description JSON with:
- Steps array with triggers and actions
- App names and action types for each step
- Parameter configurations
- Field mappings between steps
- Note: Zapier doesn't support direct JSON import, so provide a clear structure that can be manually configured`
      }

      return `You are an expert in workflow automation. Create a complete, functional ${platform} workflow based on this description:

${description}

Platform: ${platform}

${platformInstructions}

Requirements:
1. Generate VALID JSON that can be directly imported/used in ${platform}
2. Include all necessary nodes/modules for the workflow
3. Set up proper connections and data flow
4. Add realistic parameter values and configurations
5. Include error handling where appropriate
6. Make the workflow production-ready
7. Return ONLY the JSON code without explanations
8. Do NOT include markdown code blocks or additional text

IMPORTANT: Start directly with the JSON structure ({ or [). Do not include any explanations before or after.`
    }
    if (action === 'explain_workflow') {
      const { code, platform } = input
      
      return `You are a workflow automation expert. Analyze and explain this ${platform} workflow in detail.

Workflow Code:
${code}

Platform: ${platform}

Please provide a comprehensive explanation that includes:
1. **Overall Purpose**: What does this workflow do?
2. **Trigger/Start**: How does the workflow begin?
3. **Steps Breakdown**: Explain each step/node in order
4. **Data Flow**: How data moves between steps
5. **End Result**: What happens when the workflow completes

Write in Spanish and use clear, simple language. Make it easy to understand for someone who may not be familiar with ${platform}.`
    }
    return ''
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: AIRequest = await request.json()
    const { tool, action, input, description } = body

    // Handle website generator special cases
    if (action === 'generate_website' && description) {
      const promptGenerator = TOOL_PROMPTS['ai-website-generator']
      const prompt = promptGenerator(action, description)
      
      // Call the LLM API
      const messages = [{ role: 'user', content: prompt }]
      
      const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages,
          max_tokens: 4000,
        })
      })

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.statusText}`)
      }

      const data = await response.json()
      const result = data.choices?.[0]?.message?.content || ''
      
      // Clean up the result - remove markdown code blocks if present
      let cleanedResult = result.trim()
      if (cleanedResult.startsWith('```html')) {
        cleanedResult = cleanedResult.replace(/^```html\n/, '').replace(/\n```$/, '')
      } else if (cleanedResult.startsWith('```')) {
        cleanedResult = cleanedResult.replace(/^```\n/, '').replace(/\n```$/, '')
      }
      
      return Response.json({ result: cleanedResult })
    }

    // Handle website modification
    if (action === 'modify_website') {
      const { currentHTML, modification } = body
      
      if (!currentHTML || !modification) {
        return Response.json(
          { error: 'Current HTML and modification instructions are required' },
          { status: 400 }
        )
      }

      const promptGenerator = TOOL_PROMPTS['ai-website-generator']
      const prompt = promptGenerator(action, { currentHTML, modification })
      
      // Call the LLM API
      const messages = [{ role: 'user', content: prompt }]
      
      const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages,
          max_tokens: 4000,
        })
      })

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.statusText}`)
      }

      const data = await response.json()
      const result = data.choices?.[0]?.message?.content || ''
      
      // Clean up the result - remove markdown code blocks if present
      let cleanedResult = result.trim()
      if (cleanedResult.startsWith('```html')) {
        cleanedResult = cleanedResult.replace(/^```html\n/, '').replace(/\n```$/, '')
      } else if (cleanedResult.startsWith('```')) {
        cleanedResult = cleanedResult.replace(/^```\n/, '').replace(/\n```$/, '')
      }
      
      return Response.json({ result: cleanedResult })
    }

    // Handle workflow generation
    if (action === 'generate_workflow') {
      const { description, platform } = body
      
      if (!description || !platform) {
        return Response.json(
          { error: 'Description and platform are required' },
          { status: 400 }
        )
      }

      const promptGenerator = TOOL_PROMPTS['workflow-generator']
      const prompt = promptGenerator(action, { description, platform })
      
      // Call the LLM API
      const messages = [{ role: 'user', content: prompt }]
      
      const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages,
          max_tokens: 4000,
        })
      })

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.statusText}`)
      }

      const data = await response.json()
      const result = data.choices?.[0]?.message?.content || ''
      
      // Clean up the result - remove markdown code blocks if present
      let cleanedResult = result.trim()
      if (cleanedResult.startsWith('```json')) {
        cleanedResult = cleanedResult.replace(/^```json\n/, '').replace(/\n```$/, '')
      } else if (cleanedResult.startsWith('```')) {
        cleanedResult = cleanedResult.replace(/^```\n/, '').replace(/\n```$/, '')
      }
      
      return Response.json({ result: cleanedResult })
    }

    // Handle workflow explanation
    if (action === 'explain_workflow') {
      const { code, platform } = body
      
      if (!code || !platform) {
        return Response.json(
          { error: 'Code and platform are required' },
          { status: 400 }
        )
      }

      const promptGenerator = TOOL_PROMPTS['workflow-generator']
      const prompt = promptGenerator(action, { code, platform })
      
      // Call the LLM API
      const messages = [{ role: 'user', content: prompt }]
      
      const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages,
          max_tokens: 2000,
        })
      })

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.statusText}`)
      }

      const data = await response.json()
      const result = data.choices?.[0]?.message?.content || ''
      
      return Response.json({ result: result.trim() })
    }

    if (!tool || !action) {
      return Response.json(
        { error: 'Tool and action are required' },
        { status: 400 }
      )
    }

    // Get the appropriate prompt
    const promptGenerator = TOOL_PROMPTS[tool]
    if (!promptGenerator) {
      return Response.json(
        { error: `Unknown tool: ${tool}` },
        { status: 400 }
      )
    }

    const prompt = promptGenerator(action, input)
    if (!prompt) {
      return Response.json(
        { error: `Unknown action: ${action} for tool: ${tool}` },
        { status: 400 }
      )
    }

    // Determine if we need JSON response
    const needsJsonResponse = [
      'generate-payload',
      'generate',
      'suggest-complementary',
      'generate-palette',
      'parse-natural',
      'generate-meaningful',
      'generate-from-text'
    ].includes(action)

    // Call the LLM API
    const messages = [{ role: 'user', content: prompt }]
    
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages,
        stream: true,
        max_tokens: 2000,
        ...(needsJsonResponse ? { response_format: { type: 'json_object' } } : {})
      })
    })

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.statusText}`)
    }

    // If JSON response is needed, buffer it
    if (needsJsonResponse) {
      const stream = new ReadableStream({
        async start(controller) {
          const reader = response.body?.getReader()
          const decoder = new TextDecoder()
          const encoder = new TextEncoder()
          let buffer = ''
          let partialRead = ''

          try {
            while (true) {
              const { done, value } = await reader!.read()
              if (done) break
              
              partialRead += decoder.decode(value, { stream: true })
              let lines = partialRead.split('\n')
              partialRead = lines.pop() || ''

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6)
                  if (data === '[DONE]') {
                    try {
                      const finalResult = JSON.parse(buffer)
                      const finalData = JSON.stringify({
                        status: 'completed',
                        result: finalResult
                      })
                      controller.enqueue(encoder.encode(`data: ${finalData}\n\n`))
                    } catch (e) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        status: 'error',
                        message: 'Failed to parse JSON response'
                      })}\n\n`))
                    }
                    controller.close()
                    return
                  }
                  try {
                    const parsed = JSON.parse(data)
                    buffer += parsed.choices?.[0]?.delta?.content || ''
                    const progressData = JSON.stringify({
                      status: 'processing',
                      message: 'Generating...'
                    })
                    controller.enqueue(encoder.encode(`data: ${progressData}\n\n`))
                  } catch (e) {
                    // Skip invalid JSON
                  }
                }
              }
            }
          } catch (error) {
            console.error('Stream error:', error)
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              status: 'error',
              message: 'Stream processing failed'
            })}\n\n`))
            controller.close()
          }
        }
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      })
    }

    // For non-JSON responses, stream directly
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        const encoder = new TextEncoder()
        let buffer = ''

        try {
          while (true) {
            const { done, value } = await reader!.read()
            if (done) {
              // Send final complete response
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                status: 'completed',
                result: buffer
              })}\n\n`))
              controller.close()
              break
            }
            
            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') continue
                
                try {
                  const parsed = JSON.parse(data)
                  const content = parsed.choices?.[0]?.delta?.content || ''
                  if (content) {
                    buffer += content
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                      status: 'streaming',
                      content: content
                    })}\n\n`))
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream error:', error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            status: 'error',
            message: 'Stream processing failed'
          })}\n\n`))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
  } catch (error) {
    console.error('AI assist error:', error)
    return Response.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    )
  }
}
