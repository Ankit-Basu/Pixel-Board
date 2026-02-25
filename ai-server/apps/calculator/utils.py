from groq import Groq
import ast
import json
import base64
from io import BytesIO
from PIL import Image
from constants import GROQ_API_KEY

client = Groq(api_key=GROQ_API_KEY)
MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"


def image_to_base64(img: Image.Image) -> str:
    """Convert a PIL Image to a base64 string for Groq vision API."""
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode("utf-8")


def analyze_image(img: Image.Image, dict_of_vars: dict):
    img_b64 = image_to_base64(img)
    dict_of_vars_str = json.dumps(dict_of_vars, ensure_ascii=False)

    prompt = (
        f"You have been given an image with some mathematical expressions, equations, or graphical problems, and you need to solve them. "
        f"IMPORTANT: Only analyze the most recently drawn equation/expression in the image. "
        f"Ignore any previous answers or drawings that might appear in the image. "
        f"Focus only on the newest, freshest marks in the image. "
        f"Note: Use the PEMDAS rule for solving mathematical expressions. PEMDAS stands for the Priority Order: Parentheses, Exponents, Multiplication and Division (from left to right), Addition and Subtraction (from left to right). "
        f"YOU CAN HAVE FIVE TYPES OF EQUATIONS/EXPRESSIONS IN THIS IMAGE, AND ONLY ONE CASE SHALL APPLY EVERY TIME: "
        f"Following are the cases: "
        f"1. Simple mathematical expressions like 2 + 2, 3 * 4, 5 / 6, 7 - 8, etc.: In this case, solve and return the answer in the format of a LIST OF ONE DICT [{{'expr': given expression, 'result': calculated answer}}]. "
        f"2. Set of Equations like x^2 + 2x + 1 = 0, 3y + 4x = 0, 5x^2 + 6y + 7 = 12, etc.: In this case, solve for the given variable, and the format should be a COMMA SEPARATED LIST OF DICTS, with dict 1 as {{'expr': 'x', 'result': 2, 'assign': True}} and dict 2 as {{'expr': 'y', 'result': 5, 'assign': True}}. "
        f"3. Assigning values to variables like x = 4, y = 5, z = 6, etc.: In this case, assign values to variables and return another key in the dict called {{'assign': True}}, keeping the variable as 'expr' and the value as 'result' in the original dictionary. RETURN AS A LIST OF DICTS. "
        f"4. Analyzing Graphical Math problems, which are word problems represented in drawing form, such as cars colliding, trigonometric problems, problems on the Pythagorean theorem, etc. PAY CLOSE ATTENTION TO DIFFERENT COLORS FOR THESE PROBLEMS. Return the answer in the format of a LIST OF ONE DICT [{{'expr': given expression, 'result': calculated answer}}]. "
        f"5. Detecting Abstract Concepts that a drawing might show, such as love, hate, jealousy, patriotism, etc. USE THE SAME FORMAT AS OTHERS TO RETURN THE ANSWER, where 'expr' will be the explanation of the drawing, and 'result' will be the abstract concept. "
        f"Analyze the equation or expression in this image and return the answer according to the given rules. "
        f"For complex expressions, follow these additional guidelines:\n"
        f"- For calculus problems: Show each step of differentiation/integration with proper notation.\n"
        f"- For matrix operations: Show intermediate steps.\n"
        f"- For trigonometric identities: Show step-by-step simplification.\n"
        f"- For systems of equations: Use appropriate methods and show all steps.\n"
        f"- For word problems: Extract relevant quantities, set up equations, and solve systematically.\n\n"
        f"Make sure to use extra backslashes for escape characters like \\f -> \\\\f, \\n -> \\\\n, etc. "
        f"Here is a dictionary of user-assigned variables. If the given expression has any of these variables, use its actual value from this dictionary accordingly: {dict_of_vars_str}. "
        f"DO NOT USE BACKTICKS OR MARKDOWN FORMATTING. "
        f"PROPERLY QUOTE THE KEYS AND VALUES IN THE DICTIONARY FOR EASIER PARSING WITH Python's ast.literal_eval."
    )

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/png;base64,{img_b64}",
                        },
                    },
                ],
            }
        ],
        temperature=0.2,
        max_tokens=4096,
    )

    response_text = response.choices[0].message.content.strip()
    print("Raw response:", response_text)
    answers = []

    def extract_json_from_text(s):
        """Try multiple strategies to extract valid JSON from AI response."""
        # Strategy 1: Direct JSON parse
        try:
            return json.loads(s)
        except (json.JSONDecodeError, ValueError):
            pass

        # Strategy 2: Direct literal eval
        try:
            return ast.literal_eval(s)
        except (ValueError, SyntaxError):
            pass

        # Strategy 3: Extract from markdown code blocks
        import re
        code_block_patterns = [
            r'```json\s*\n?(.*?)\n?\s*```',
            r'```\s*\n?(.*?)\n?\s*```',
        ]
        for pattern in code_block_patterns:
            match = re.search(pattern, s, re.DOTALL)
            if match:
                block = match.group(1).strip()
                if block.startswith('json'):
                    block = block[4:].strip()
                try:
                    return json.loads(block)
                except (json.JSONDecodeError, ValueError):
                    try:
                        return ast.literal_eval(block)
                    except (ValueError, SyntaxError):
                        pass

        # Strategy 4: Find anything that looks like a JSON array [...]
        bracket_match = re.search(r'\[.*\]', s, re.DOTALL)
        if bracket_match:
            try:
                return json.loads(bracket_match.group(0))
            except (json.JSONDecodeError, ValueError):
                try:
                    return ast.literal_eval(bracket_match.group(0))
                except (ValueError, SyntaxError):
                    pass

        # Strategy 5: Find anything that looks like a JSON object {...}
        brace_match = re.search(r'\{.*\}', s, re.DOTALL)
        if brace_match:
            try:
                return json.loads(brace_match.group(0))
            except (json.JSONDecodeError, ValueError):
                try:
                    return ast.literal_eval(brace_match.group(0))
                except (ValueError, SyntaxError):
                    pass

        # Strategy 6: Try to find "result" or "answer" or "=" in text
        eq_match = re.search(r'=\s*([+-]?\d+\.?\d*)', s)
        if eq_match:
            return [{"expr": "expression", "result": eq_match.group(1), "assign": False}]

        return None

    try:
        parsed = extract_json_from_text(response_text)
        if parsed is not None:
            answers = parsed if isinstance(parsed, list) else [parsed]
        else:
            print(f"Could not parse response, returning raw text")
            answers = [{"expr": "Result", "result": response_text[:200], "assign": False}]
    except Exception as e:
        print(f"Error in parsing response from Groq API: {e}")
        print(f"Response text: {response_text}")
        answers = [{"expr": "Result", "result": response_text[:200], "assign": False}]

    print('Parsed answer:', answers)

    for answer in answers:
        if not isinstance(answer, dict):
            continue
        if 'assign' not in answer:
            answer['assign'] = False
    return answers


def get_explanation(img: Image.Image, question: str, history: list[dict]):
    img_b64 = image_to_base64(img)

    messages = []
    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})

    prompt = (
        "Provide a detailed step-by-step mathematical explanation with the following strict formatting rules:\n\n"
        "1. STRUCTURE REQUIREMENTS:\n"
        "- Begin with a clear statement of the problem\n"
        "- Use numbered steps for each part of the solution\n"
        "- End with a clear final answer\n"
        "- Separate steps with blank lines for readability\n\n"
        "2. MATHEMATICAL NOTATION:\n"
        "- For inline math: wrap with single dollar signs like $x^2$\n"
        "- For display math: wrap with double dollar signs like $$\\int f(x) dx$$\n"
        "- Always escape special characters\n"
        "- Use proper LaTeX notation for all symbols\n\n"
        "3. CONTENT REQUIREMENTS:\n"
        "- Explain each transformation clearly\n"
        "- Show intermediate steps\n"
        "- Highlight key mathematical rules used\n"
        "- Keep technical language precise but accessible\n\n"
        f"Now explain this problem:\n"
        f"User's question: {question}"
    )

    messages.append({
        "role": "user",
        "content": [
            {"type": "text", "text": prompt},
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/png;base64,{img_b64}",
                },
            },
        ],
    })

    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        temperature=0.3,
        max_tokens=4096,
    )

    return response.choices[0].message.content
