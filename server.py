from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from main import DAOProposalGenerator, DAOProposalInput

app = FastAPI(
    title=".",
    description=".",
    version="2.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite's default port
        "http://localhost:5174",  # Alternative Vite port
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
        "http://0.0.0.0:8000/",
        "http://localhost:3001",
        "http://0.0.0.0:3001"
        
    ],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

generator = DAOProposalGenerator()


@app.get("/")
def home():
    return {
        "service": "DAO Proposal Generator",
        "status": "running",
        "version": "2.0.0",
        "features": [
            "Parallel multi-agent voting",
            "Specialized validator roles",
            "Debate rounds",
            "Confidence-weighted decisions"
        ]
    }


@app.get("/health")
def health_check():
    return {"status": "healthy", "validators": 5, "voting_phases": 3}


@app.post("/generate_proposal")
async def generate_proposal(req: DAOProposalInput):
    
    try:
        result = await generator.run(req)
        proposal = result.get("proposal", {})
        
        metadata = {
            "voting_results": {
                "final_decision": result.get("decision", "REJECTED"),
                "weighted_score": result.get("weighted_score", 0.0),
                "initial_votes": {
                    "approve": result.get("voting_summary", {}).get("initial_approve", 0),
                    "reject": result.get("voting_summary", {}).get("initial_reject", 0)
                },
                "final_votes": {
                    "approve": result.get("voting_summary", {}).get("final_approve", 0),
                    "reject": result.get("voting_summary", {}).get("final_reject", 0)
                },
                "votes_changed": result.get("voting_summary", {}).get("votes_changed", 0),
                "debate_occurred": len(result.get("debate_arguments", [])) > 0
            },
            "proposal_details": {
                "title": proposal.get("title", ""),
                "abstract": proposal.get("abstract", ""),
                "requested_funds": proposal.get("requested_funds"),
                "proposer": proposal.get("proposer", req.proposer_wallet)
            },
            "validator_consensus": {
                "confidence_levels": [
                    {
                        "validator": v.get("validator_id"),
                        "role": v.get("role"),
                        "confidence": v.get("confidence")
                    }
                    for v in result.get("final_votes", [])
                ]
            }
        }
        
        return {
            "success": True,
            "domain": proposal.get("domain", "general"),
            "fungible": result.get("fungible", "no")
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": str(e),
                "message": "Failed to generate proposal or complete voting process"
            }
        )


if __name__ == "__main__":
    import uvicorn
    print("Starting DAO Proposal Generator API")
    
    
    uvicorn.run(app, host="127.0.0.1", port=8000)