from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from main import DAOProposalGenerator, DAOProposalInput

app = FastAPI(
    title="DAO Proposal Generator API",
    description="Multi-agent DAO governance system with parallel voting and debate",
    version="2.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:4444",
        "http://127.0.0.1:4444",
        "http://localhost:3000",
        "http://localhost:3001",
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


@app.post("/classify")
async def classify_challenge(req: DAOProposalInput):
    """
    Classify challenge for fundibility and domain.
    This endpoint is called by the backend after challenge creation.
    
    Returns: domain and fungible (yes/no)
    """
    try:
        print(f"[ML Model] Received classification request for challenge: {req.challenge_id}")
        print(f"[ML Model] Challenge text: {req.challenge_text[:100]}...")
        
        result = await generator.run(req)
        proposal = result.get("proposal", {})
        
        domain = proposal.get("domain", "general")
        fungible = result.get("fungible", "no")
        
        print(f"[ML Model] Classification complete: domain={domain}, fungible={fungible}")
        
        return {
            "success": True,
            "domain": domain,
            "fundible": fungible,  # Note: backend expects 'fundible' not 'fungible'
            "decision": result.get("decision", "REJECTED"),
            "metadata": {
                "voting_summary": result.get("voting_summary", {}),
                "weighted_score": result.get("weighted_score", 0.0)
            }
        }

    except Exception as e:
        print(f"[ML Model] Error during classification: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": str(e),
                "message": "Failed to classify challenge"
            }
        )


@app.post("/generate_proposal")
async def generate_proposal(req: DAOProposalInput):
    """
    Generate full DAO proposal with multi-agent voting system.
    
    Returns: complete proposal with voting results
    """
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
            "fungible": result.get("fungible", "no"),
            "proposal": proposal,
            "metadata": metadata
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
    print("=" * 80)
    print("🚀 Starting DAO Proposal Generator API (ML Model Server)")
    print("=" * 80)
    print("Access the API at:")
    print("  • http://localhost:8080")
    print("  • http://127.0.0.1:8080")
    print("📚 API Documentation: http://localhost:8080/docs")
    print("=" * 80)
    
    uvicorn.run(app, host="127.0.0.1", port=8080)
