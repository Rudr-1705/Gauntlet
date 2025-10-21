from pydantic import BaseModel, Field, HttpUrl
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.graph import StateGraph, END
from typing import TypedDict, List, Optional, Dict
from dotenv import load_dotenv
import json
import asyncio
import re

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
            output: DAOProposalOutput = self.structured_llm.invoke(messages)
            state["generated_proposal"] = output.dict()
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
            messages = [
                SystemMessage(content=f"""
                    You are {validator_id}, a specialized DAO governance validator. Your primary goal is to **facilitate value creation** for the DAO.
                    
                    YOUR EXPERTISE: {role_info['focus']}
                    
                    EVALUATION CRITERIA: {', '.join(role_info['criteria'])}
                    
                    Carefully review the proposal. **Only vote REJECT if the proposal is fundamentally flawed or severely harmful.** Otherwise, default to APPROVE with specific CONCERNS for improvement. Provide:
                    1. DECISION: Start with either "APPROVE" or "REJECT"
                    2. CONFIDENCE: Rate 1-10 (10 = extremely confident)
                    3. REASONING: 2-3 sentences explaining your decision
                    4. CONCERNS: List 2-3 specific issues or questions that, if resolved, would ensure success.
                    
                    Format your response as:
                    DECISION: [APPROVE/REJECT]
                    CONFIDENCE: [1-10]
                    REASONING: [Your explanation]
                    CONCERNS: [Concern 1], [Concern 2], [Concern 3]
                """),
                HumanMessage(content=f"PROPOSAL TO EVALUATE:\n{json.dumps(proposal, indent=2)}")
            ]
            
            try:
                response = await llm.ainvoke(messages)
                content = response.content.strip()
                
                
                vote_match = re.search(r'DECISION:\s*(APPROVE|REJECT)', content, re.IGNORECASE)
                conf_match = re.search(r'CONFIDENCE:\s*(\d+)', content)
                reasoning_match = re.search(r'REASONING:\s*(.+?)(?=CONCERNS:|$)', content, re.DOTALL)
                concerns_match = re.search(r'CONCERNS:\s*(.+?)$', content, re.DOTALL)
                
                vote = vote_match.group(1).upper() if vote_match else "REJECT"
                confidence = int(conf_match.group(1)) if conf_match else 5
                confidence = max(1, min(10, confidence))  
                reasoning = reasoning_match.group(1).strip() if reasoning_match else "No reasoning provided"
                
                concerns = []
                if concerns_match:
                    concerns = [c.strip() for c in concerns_match.group(1).split(',')]
                    concerns = [c for c in concerns if c][:3]  
                
                return {
                    "validator_id": validator_id,
                    "role": role_info['focus'].split(',')[0],
                    "vote": vote,
                    "confidence": confidence,
                    "reasoning": reasoning,
                    "concerns": concerns
                }
                
            except Exception as e:
                
                return {
                    "validator_id": validator_id,
                    "role": role_info['focus'].split(',')[0],
                    "vote": "REJECT",
                    "confidence": 3,
                    "reasoning": f"Error in evaluation: {str(e)}",
                    "concerns": ["Technical error in voting process"]
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
            all_concerns.extend(v["concerns"])
        
        debate_arguments = []
        
        for validator in minority_validators:
            debate_prompt = f"""
                The proposal currently has {approve_count} APPROVE and {reject_count} REJECT votes.
                You voted {minority_side} with confidence {validator['confidence']}/10.
                
                Your original reasoning: {validator['reasoning']}
                Your concerns: {', '.join(validator['concerns'])}
                
                Other validators raised: {', '.join(all_concerns[:5])}
                
                Present the **most constructive path forward** to address the issues raised by the majority. If you voted REJECT, explain the precise mitigation steps needed for you to change your vote to APPROVE. If you voted APPROVE, defend the project's core value.
                Be specific and keep it to 3-4 sentences maximum.
            """
            
            messages = [
                SystemMessage(content=f"You are {validator['validator_id']}, defending your {minority_side} vote."),
                HumanMessage(content=debate_prompt)
            ]
            
            try:
                response = await llm.ainvoke(messages)
                debate_arguments.append({
                    "validator_id": validator['validator_id'],
                    "side": minority_side,
                    "argument": response.content.strip(),
                    "original_confidence": validator['confidence']
                })
            except Exception:
                pass
        
        state["debate_arguments"] = debate_arguments
        return state

    
    async def _final_vote_node(self, state: WorkflowState) -> dict:
        """Re-vote after hearing debate arguments - validators can change their mind"""
        votes = state["validator_votes"]
        debate_args = state.get("debate_arguments", [])
        proposal = state["generated_proposal"]
        
        if not votes:
            state["final_votes"] = []
            state["final_decision"] = "REJECTED"
            state["weighted_score"] = -10.0
            return state
        
        
        if not debate_args:
            state["final_votes"] = votes
            weighted_score = sum(
                (1 if v["vote"] == "APPROVE" else -1) * (v["confidence"] / 10)
                for v in votes
            )
            state["weighted_score"] = weighted_score
            state["final_decision"] = "APPROVED" if weighted_score > 0 else "REJECTED"
            return state
        
        
        debate_summary = "\n\n".join([
            f"{arg['validator_id']} ({arg['side']}, confidence {arg['original_confidence']}/10):\n{arg['argument']}"
            for arg in debate_args
        ])
        
        async def get_final_vote(original_vote: ValidatorVote) -> ValidatorVote:
            messages = [
                SystemMessage(content=f"""
                    You are {original_vote['validator_id']}, reconsidering your vote after debate.
                    
                    Your original vote: {original_vote['vote']} (confidence {original_vote['confidence']}/10)
                    
                    Assess the debate. If the arguments or counterpoints have provided a clear path to **mitigate your primary concerns**, you are strongly encouraged to **change your vote to APPROVE**.
                    
                    Respond with:
                    DECISION: [APPROVE/REJECT]
                    CONFIDENCE: [1-10]
                    REASONING: [Brief explanation of final decision]
                """),
                HumanMessage(content=f"DEBATE ARGUMENTS:\n{debate_summary}\n\nYour final vote?")
            ]
            
            try:
                response = await llm.ainvoke(messages)
                content = response.content.strip()
                
                vote_match = re.search(r'DECISION:\s*(APPROVE|REJECT)', content, re.IGNORECASE)
                conf_match = re.search(r'CONFIDENCE:\s*(\d+)', content)
                reasoning_match = re.search(r'REASONING:\s*(.+?)$', content, re.DOTALL)
                
                final_vote = vote_match.group(1).upper() if vote_match else original_vote["vote"]
                final_confidence = int(conf_match.group(1)) if conf_match else original_vote["confidence"]
                final_confidence = max(1, min(10, final_confidence))
                final_reasoning = reasoning_match.group(1).strip() if reasoning_match else original_vote["reasoning"]
                
                return {
                    "validator_id": original_vote["validator_id"],
                    "role": original_vote["role"],
                    "vote": final_vote,
                    "confidence": final_confidence,
                    "reasoning": final_reasoning,
                    "concerns": original_vote["concerns"]
                }
                
            except Exception:
                return original_vote  
        
        
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

        
        text_parts = [
            str(proposal.get(k, "")).lower() 
            for k in ("title", "abstract", "motivation", "actions", "expected_impact", "requested_funds")
        ]
        
        text_parts.append(input_data.get("challenge_text", "").lower())
        
        text = " ".join(text_parts)

        
        monetary_keywords = [
            
            "fund", "reward", "grant", "payment", "budget", "payout", "compensation", "bounty", "incentive", "stipend",
            "cost", "fee", "expense", "allocation", "disburse",
            
            "token", "stablecoin", "pyusd", "usdc", "dai", "eth", "matic", "coin", "asset", "nft", "share", "crypto",
            
            "treasury", "capital", "fiat", "vault", "reserve", "yield", "pool", "swap", "exchange", "loan", "borrow",
            
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
            "initial_votes": final_state["validator_votes"],
            "debate_arguments": final_state.get("debate_arguments", []),
            "final_votes": final_state.get("final_votes", []),
            "decision": final_state["final_decision"],
            "weighted_score": final_state.get("weighted_score", 0.0),
            "fungible": final_state["fungible"],
            "voting_summary": {
                "initial_approve": sum(1 for v in final_state["validator_votes"] if v["vote"] == "APPROVE"),
                "initial_reject": sum(1 for v in final_state["validator_votes"] if v["vote"] == "REJECT"),
                "final_approve": sum(1 for v in final_state.get("final_votes", []) if v["vote"] == "APPROVE"),
                "final_reject": sum(1 for v in final_state.get("final_votes", []) if v["vote"] == "REJECT"),
                "votes_changed": sum(1 for i, v in enumerate(final_state.get("final_votes", [])) 
                                       if i < len(final_state["validator_votes"]) and 
                                       v["vote"] != final_state["validator_votes"][i]["vote"])
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
    import asyncio
    asyncio.run(main())