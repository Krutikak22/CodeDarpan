import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import re
import base64
import google.generativeai as genai

# --- CONFIGURATION ---
GEMINI_API_KEY = "AIzaSyCXn4rvP6Ux31cj5fHZaDusMSQweq7kTvc" 

genai.configure(api_key=GEMINI_API_KEY)

# We will try to load the model, but handle the error gracefully later
try:
    model = genai.GenerativeModel('gemini-1.5-flash')
except:
    model = None 

app = FastAPI()

origins = ["http://localhost:5173", "http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RepoRequest(BaseModel):
    url: str

# --- HELPER FUNCTIONS ---

def decode_github_content(encoded_content):
    try:
        return base64.b64decode(encoded_content).decode('utf-8')
    except:
        return ""

# --- THE FIX: SAFETY MODE AI ANALYSIS ---
async def get_ai_analysis(readme_content, file_structure):
    try:
        if not model: raise Exception("Model not loaded")
        
        prompt = f"""
        You are a senior technical interviewer. Analyze this project.
        Files: {', '.join(file_structure[:50])}
        README Snippet: {readme_content[:1500]}
        
        Task:
        1. Write a professional 4-sentence summary for a resume.
        2. Provide 3 technical improvement tips.
        
        Format:
        Summary: [Text]
        Tips:
        - [Tip 1]
        - [Tip 2]
        - [Tip 3]
        """
        response = await model.generate_content_async(prompt)
        text = response.text
        
        summary_match = re.search(r"Summary:\s*(.*)", text, re.DOTALL)
        summary = summary_match.group(1).split("Tips:")[0].strip() if summary_match else "Analysis Complete."
        tips = re.findall(r"-\s*(.*)", text)
        return summary, tips

    except Exception as e:
        # 2. FALLBACK MODE (If AI fails, use this so the app doesn't crash)
        print(f"⚠️ AI Error: {e}. Using Backup Mode.")
        return (
            "✅ (Backup Mode) This project appears to be a well-structured application. "
            "It utilizes standard naming conventions and includes essential configuration files. "
            "The file structure suggests a clear separation of concerns, making it maintainable. "
            "To get a real AI analysis, please update the 'model' name in backend/main.py.",
            
            ["Add more unit tests to improve reliability.", 
             "Expand the README with setup instructions.", 
             "Set up a CI/CD pipeline for automation."]
        )

def calculate_persona(score, languages_dict, has_tests, has_readme):
    total_bytes = sum(languages_dict.values()) if languages_dict else 0
    dominant_lang = max(languages_dict, key=languages_dict.get) if languages_dict else ""
    is_python_heavy = languages_dict.get('Python', 0) / total_bytes > 0.4 if total_bytes > 0 else False

    if score >= 90 and has_tests: return "The Architect 🏛️"
    elif score < 50: return "The Cowboy Coder 🤠"
    elif is_python_heavy and score > 75: return "Data Wizard 🧙‍♂️"
    elif dominant_lang in ['JavaScript', 'TypeScript', 'HTML', 'CSS']: return "Frontend Craftsman 🎨"
    else: return "Code Explorer 🔭"

# --- MAIN ENDPOINT ---

@app.post("/analyze")
async def analyze_repo(request: RepoRequest):
    match = re.search(r"github\.com/([^/]+)/([^/]+)", request.url)
    if not match: raise HTTPException(status_code=400, detail="Invalid GitHub URL")
    owner, repo = match.groups()

    async with httpx.AsyncClient() as client:
        repo_res = await client.get(f"https://api.github.com/repos/{owner}/{repo}")
        if repo_res.status_code != 200: raise HTTPException(status_code=404, detail="Repo not found")
        repo_data = repo_res.json()

        files_res = await client.get(f"https://api.github.com/repos/{owner}/{repo}/contents")
        files_list = files_res.json() if files_res.status_code == 200 else []
        file_names = [f['name'].lower() for f in files_list]

        lang_res = await client.get(f"https://api.github.com/repos/{owner}/{repo}/languages")
        languages_dict = lang_res.json() if lang_res.status_code == 200 else {}

        readme_res = await client.get(f"https://api.github.com/repos/{owner}/{repo}/readme")
        readme_content = ""
        if readme_res.status_code == 200:
             readme_content = decode_github_content(readme_res.json()['content'])

        score = 60
        roadmap = []
        has_readme = 'readme.md' in file_names
        has_tests = any('test' in f for f in file_names)

        if has_readme: score += 10
        else: roadmap.append("Add a README.md")
        
        if any(x in file_names for x in ['requirements.txt', 'package.json']): score += 10
        else: roadmap.append("Add dependency file")

        if '.gitignore' in file_names: score += 5
        else: roadmap.append("Add .gitignore")

        if has_tests: score += 15
        else: roadmap.append("Add Unit Tests")

        # Call AI (Safe Version)
        ai_summary, ai_tips = await get_ai_analysis(readme_content, file_names)
        roadmap.extend(ai_tips)

        persona = calculate_persona(score, languages_dict, has_tests, has_readme)

        return {
            "score": min(score, 100),
            "summary": ai_summary,
            "roadmap": roadmap,
            "persona": persona,
            "details": {
                "stars": repo_data.get("stargazers_count"),
                "forks": repo_data.get("forks_count"),
                "primary_language": repo_data.get("language") or "Unknown",
                "language_breakdown": languages_dict 
            }
        }

if __name__ == "__main__":

    uvicorn.run(app, host="0.0.0.0", port=8000)
