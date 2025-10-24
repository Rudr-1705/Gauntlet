from pydantic import BaseModel, Field, HttpUrl
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.graph import StateGraph, END
from typing import TypedDict, List, Optional, Dict
import asyncio
import json
import os

from dotenv import load_dotenv

load_dotenv()
llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0.2)




class DAOProposalInput(BaseModel):
    challenge_id: str
    challenge_text: str
    proposer_wallet: Optional[str] = None
    urgency_level: Optional[str] = "medium"
    supporting_links: Optional[List[HttpUrl]] = []
    requested_reward: float



class DAOProposalOutput(BaseModel):
    title: str
    abstract: str
    motivation: str
    actions: List[str]
    expected_impact: str
    audit_references: Optional[List[HttpUrl]] = []
    requested_funds: Optional[str] = None
    domain: str
    proposer: Optional[str] = None


class ValidatorVote(TypedDict):
    validator_id: str
    role: str
    vote: str
    confidence: int
    reasoning: str
    concerns: List[str]


class WorkflowState(TypedDict):
    proposal_input: dict
    generated_proposal: dict
    validator_votes: List[ValidatorVote]
    debate_arguments: List[Dict]
    final_votes: List[ValidatorVote]
    final_decision: str
    weighted_score: float
    fungible: str


class DAOProposalGenerator:
    def __init__(self):
        self.structured_llm = llm.with_structured_output(DAOProposalOutput)
        self.workflow = self._build_workflow()
        
        
        self.validator_roles = {
            "financial_auditor": {
                "focus": "Evaluate budget feasibility, ROI, fund allocation, and financial sustainability",
                "criteria": ["Budget clarity", "Cost-benefit ratio", "Financial risks"]
            },
            "technical_reviewer": {
                "focus": "Assess implementation complexity, technical feasibility, and potential risks",
                "criteria": ["Technical feasibility", "Implementation timeline", "Technical risks"]
            },
            "community_advocate": {
                "focus": "Judge community benefit, inclusivity, alignment with DAO mission",
                "criteria": ["Community impact", "Accessibility", "Mission alignment"]
            },
            "security_analyst": {
                "focus": "Identify security vulnerabilities, smart contract risks, and attack vectors",
                "criteria": ["Security risks", "Audit requirements", "Risk mitigation"]
            },
            "governance_expert": {
                "focus": "Check DAO governance compliance, voting procedures, and constitutional alignment",
                "criteria": ["Governance compliance", "Process adherence", "Precedent consistency"]
            }
        }

    
    def _generate_proposal_node(self, state: WorkflowState) -> dict:
        inp = state["proposal_input"]

        messages = [
            SystemMessage(content="You are a DAO assistant generating structured proposals."),
            HumanMessage(content=f"""
                Challenge ID: {inp['challenge_id']}
                Description: {inp['challenge_text']}
                Proposer Wallet: {inp.get('proposer_wallet', '')}
                Supporting Links: {inp.get('supporting_links', [])}
                Requested Reward: {inp['requested_reward']}
                Urgency: {inp.get('urgency_level', 'medium')}
                
                Generate a comprehensive DAO proposal with all required fields.
            """)
        ]

        try:
            result = self.structured_llm.invoke(messages)
            state["generated_proposal"] = result.dict()
        except Exception as e:
            state["generated_proposal"] = {"error": str(e)}

        return state

    
    async def _parallel_initial_vote_node(self, state: WorkflowState) -> dict:
        """All validators vote simultaneously with structured reasoning"""
        proposal = state["generated_proposal"]
        
        if "error" in proposal:
            state["validator_votes"] = []
            return state

        async def get_validator_vote(validator_id: str, role_info: dict) -> ValidatorVote:
            prompt = f"""
You are a DAO {validator_id.replace('_', ' ').title()}.

**Proposal Summary:**
Title: {proposal.get('title', 'N/A')}
Abstract: {proposal.get('abstract', 'N/A')}
Motivation: {proposal.get('motivation', 'N/A')}
Actions: {proposal.get('actions', 'N/A')}
Expected Impact: {proposal.get('expected_impact', 'N/A')}
Requested Funds: {proposal.get('requested_funds', 'N/A')}

**Your Focus Area:** {role_info['focus']}
**Key Criteria:** {', '.join(role_info['criteria'])}

Based on your expertise, provide your vote:
1. Vote: APPROVE or REJECT
2. Confidence: 1-10 (how certain are you?)
3. Reasoning: Brief explanation
4. Concerns: List any specific issues

Respond in JSON format:
{{
    "vote": "APPROVE" or "REJECT",
    "confidence": <1-10>,
    "reasoning": "<your reasoning>",
    "concerns": ["<concern1>", "<concern2>", ...]
}}
"""
            
            try:
                response = await llm.ainvoke([HumanMessage(content=prompt)])
                content = response.content.strip()
                
                if content.startswith("```json"):
                    content = content[7:]
                if content.startswith("```"):
                    content = content[3:]
                if content.endswith("```"):
                    content = content[:-3]
                content = content.strip()
                
                vote_data = json.loads(content)
                
                return {
                    "validator_id": validator_id,
                    "role": role_info["focus"],
                    "vote": vote_data.get("vote", "REJECT"),
                    "confidence": max(1, min(10, vote_data.get("confidence", 5))),
                    "reasoning": vote_data.get("reasoning", "No reasoning provided"),
                    "concerns": vote_data.get("concerns", [])
                }
            except Exception as e:
                return {
                    "validator_id": validator_id,
                    "role": role_info["focus"],
                    "vote": "REJECT",
                    "confidence": 1,
                    "reasoning": f"Error: {str(e)}",
                    "concerns": ["Failed to process vote"]
                }
        
        
        vote_tasks = [
            get_validator_vote(validator_id, role_info)
            for validator_id, role_info in self.validator_roles.items()
        ]
        
        votes = await asyncio.gather(*vote_tasks)
        state["validator_votes"] = votes
        
        return state

    
    async def _debate_round_node(self, state: WorkflowState) -> dict:
        """Minority opinion validators present counterarguments"""
        votes = state["validator_votes"]
        
        if not votes:
            state["debate_arguments"] = []
            return state
        
        # Calculate current sentiment
        approve_count = sum(1 for v in votes if v["vote"] == "APPROVE")
        reject_count = len(votes) - approve_count
        
        
        if approve_count == reject_count:
            state["debate_arguments"] = []
            return state
        
        minority_side = "REJECT" if approve_count > reject_count else "APPROVE"
        minority_validators = [v for v in votes if v["vote"] == minority_side]
        
        if not minority_validators or len(minority_validators) == len(votes):
            state["debate_arguments"] = []
            return state
        
        
        all_concerns = []
        for v in votes:
            all_concerns.extend(v.get("concerns", []))
        
        debate_arguments = []
        
        for validator in minority_validators:
            prompt = f"""
You are {validator['validator_id']} and you voted {validator['vote']} with confidence {validator['confidence']}/10.

The majority is leaning toward {('REJECT' if minority_side == 'APPROVE' else 'APPROVE')}.

Your original reasoning: {validator['reasoning']}
Your concerns: {validator.get('concerns', [])}

All validators' concerns: {all_concerns[:10]}

Present a compelling argument to sway the majority. Be specific and constructive.
Keep it under 100 words.
"""
            
            try:
                response = await llm.ainvoke([HumanMessage(content=prompt)])
                argument = response.content.strip()
                
                debate_arguments.append({
                    "validator_id": validator["validator_id"],
                    "side": validator["vote"],
                    "original_confidence": validator["confidence"],
                    "argument": argument
                })
            except Exception as e:
                debate_arguments.append({
                    "validator_id": validator["validator_id"],
                    "side": validator["vote"],
                    "original_confidence": validator["confidence"],
                    "argument": f"Error generating argument: {str(e)}"
                })
        
        state["debate_arguments"] = debate_arguments
        return state

    
    async def _final_vote_node(self, state: WorkflowState) -> dict:
        """Re-vote after hearing debate arguments - validators can change their mind"""
        votes = state["validator_votes"]
        debate_args = state.get("debate_arguments", [])
        proposal = state["generated_proposal"]
        
        if not votes:
            state["final_votes"] = []
            state["weighted_score"] = 0.0
            state["final_decision"] = "REJECTED"
            return state
        
        
        if not debate_args:
            state["final_votes"] = votes
            weighted_score = sum(
                (1 if v["vote"] == "APPROVE" else -1) * (v["confidence"] / 10)
                for v in votes
            )
            state["weighted_score"] = round(weighted_score, 2)
            state["final_decision"] = "APPROVED" if weighted_score > 0 else "REJECTED"
            return state
        
        
        debate_summary = "\n\n".join([
            f"{arg['validator_id']} ({arg['side']}, confidence {arg['original_confidence']}/10):\n{arg['argument']}"
            for arg in debate_args
        ])
        
        async def get_final_vote(original_vote: ValidatorVote) -> ValidatorVote:
            prompt = f"""
You are {original_vote['validator_id']}.

Your original vote: {original_vote['vote']} (confidence: {original_vote['confidence']}/10)
Your reasoning: {original_vote['reasoning']}

After the debate, minority validators presented these arguments:
{debate_summary}

Do you change your vote or maintain it? Consider:
1. Were the debate arguments compelling?
2. Did they address concerns you hadn't considered?
3. Is there new information that changes your assessment?

Respond in JSON:
{{
    "vote": "APPROVE" or "REJECT",
    "confidence": <1-10>,
    "reasoning": "<updated reasoning>",
    "vote_changed": true or false
}}
"""
            
            try:
                response = await llm.ainvoke([HumanMessage(content=prompt)])
                content = response.content.strip()
                
                if content.startswith("```json"):
                    content = content[7:]
                if content.startswith("```"):
                    content = content[3:]
                if content.endswith("```"):
                    content = content[:-3]
                content = content.strip()
                
                new_vote_data = json.loads(content)
                
                return {
                    "validator_id": original_vote["validator_id"],
                    "role": original_vote["role"],
                    "vote": new_vote_data.get("vote", original_vote["vote"]),
                    "confidence": max(1, min(10, new_vote_data.get("confidence", original_vote["confidence"]))),
                    "reasoning": new_vote_data.get("reasoning", original_vote["reasoning"]),
                    "concerns": original_vote.get("concerns", [])
                }
            except:
                return original_vote
        
        # Get final votes in parallel
        final_vote_tasks = [get_final_vote(v) for v in votes]
        final_votes = await asyncio.gather(*final_vote_tasks)
        
        
        weighted_score = sum(
            (1 if v["vote"] == "APPROVE" else -1) * (v["confidence"] / 10)
            for v in final_votes
        )
        
        state["final_votes"] = final_votes
        state["weighted_score"] = round(weighted_score, 2)
        state["final_decision"] = "APPROVED" if weighted_score > 0 else "REJECTED"
        
        return state

    
    def _determine_fungibility_node(self, state: WorkflowState) -> WorkflowState:
        """
        Decide whether the proposal is fungible based on final decision and monetary nature.
        Fungible = "yes" if approved + monetary keywords present.
        """
        proposal = state.get("generated_proposal", {})
        decision = state.get("final_decision", "REJECTED")
        input_data = state.get("proposal_input", {})

        if decision == "REJECTED" or not proposal or "error" in proposal:
            state["fungible"] = "no"
            return state

        # Collect text from both the original input and the generated proposal
        text_parts = [
            str(proposal.get(k, "")).lower() 
            for k in ("title", "abstract", "motivation", "actions", "expected_impact", "requested_funds")
        ]
        # Include the original challenge text as it's the most direct indicator
        text_parts.append(input_data.get("challenge_text", "").lower())
        
        text = " ".join(text_parts)

        # Expanded list of keywords for liberal fungibility detection
        monetary_keywords = [
            # General financial terms
            "fund", "reward", "grant", "payment", "budget", "payout", "compensation", "bounty", "incentive", "stipend",
            "cost", "fee", "expense", "allocation", "disburse",
            # Cryptocurrency and blockchain
            "token", "stablecoin", "pyusd", "usdc", "dai", "eth", "matic", "coin", "asset", "nft", "share", "crypto",
            # Financial operations
            "treasury", "capital", "fiat", "vault", "reserve", "yield", "pool", "swap", "exchange", "loan", "borrow",
            # Money transfer
            "value transfer", "escrow", "transfer", "send", "receive"
        ]
        
        has_monetary = any(keyword in text for keyword in monetary_keywords)
        state["fungible"] = "yes" if has_monetary else "no"

        return state

   
    def _build_workflow(self):
        workflow = StateGraph(WorkflowState)
        
        workflow.add_node("generate_proposal", self._generate_proposal_node)
        workflow.add_node("parallel_initial_vote", self._parallel_initial_vote_node)
        workflow.add_node("debate_round", self._debate_round_node)
        workflow.add_node("final_vote", self._final_vote_node)
        workflow.add_node("determine_fungibility", self._determine_fungibility_node)

        workflow.set_entry_point("generate_proposal")
        workflow.add_edge("generate_proposal", "parallel_initial_vote")
        workflow.add_edge("parallel_initial_vote", "debate_round")
        workflow.add_edge("debate_round", "final_vote")
        workflow.add_edge("final_vote", "determine_fungibility")
        workflow.add_edge("determine_fungibility", END)

        return workflow.compile()

    
    async def run(self, proposal_input: DAOProposalInput) -> dict:
        """Execute the complete DAO proposal workflow"""
        initial_state = {
            "proposal_input": proposal_input.dict(),
            "generated_proposal": {},
            "validator_votes": [],
            "debate_arguments": [],
            "final_votes": [],
            "final_decision": "",
            "weighted_score": 0.0,
            "fungible": "",
        }
        
        final_state = await self.workflow.ainvoke(initial_state)
        
        return {
            "proposal": final_state["generated_proposal"],
            "decision": final_state["final_decision"],
            "weighted_score": final_state["weighted_score"],
            "fungible": final_state["fungible"],
            "initial_votes": final_state["validator_votes"],
            "debate_arguments": final_state["debate_arguments"],
            "final_votes": final_state["final_votes"],
            "voting_summary": {
                "initial_approve": sum(1 for v in final_state["validator_votes"] if v["vote"] == "APPROVE"),
                "initial_reject": sum(1 for v in final_state["validator_votes"] if v["vote"] == "REJECT"),
                "final_approve": sum(1 for v in final_state["final_votes"] if v["vote"] == "APPROVE"),
                "final_reject": sum(1 for v in final_state["final_votes"] if v["vote"] == "REJECT"),
                "votes_changed": sum(
                    1 for i, v in enumerate(final_state["final_votes"])
                    if v["vote"] != final_state["validator_votes"][i]["vote"]
                )
            }
        }


async def main():
    generator = DAOProposalGenerator()
    
    
    proposal_input = DAOProposalInput(
        challenge_id="PROP-2025-001",
        challenge_text="Implement a community treasury management dashboard with real-time analytics",
        proposer_wallet="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        urgency_level="high",
        supporting_links=["https://github.com/dao/treasury-dashboard"],
        requested_reward=50000.0
    )
    
    result = await generator.run(proposal_input)
    
    print("=" * 80)
    print(f"PROPOSAL: {result['proposal'].get('title', 'N/A')}")
    print("=" * 80)
    print(f"\nFinal Decision: {result['decision']}")
    print(f"Weighted Score: {result['weighted_score']}")
    print(f"Fungible: {result['fungible']}")
    print(f"\nVoting Summary:")
    print(f"  Initial: {result['voting_summary']['initial_approve']} APPROVE, {result['voting_summary']['initial_reject']} REJECT")
    print(f"  Final: {result['voting_summary']['final_approve']} APPROVE, {result['voting_summary']['final_reject']} REJECT")
    print(f"  Votes Changed: {result['voting_summary']['votes_changed']}")
    

if __name__ == "__main__":
    import sys
    asyncio.run(main())
