# Convert Conversation to Training Data

You are tasked with converting a sample conversation markdown file into structured JSON training data for GEPA prompt optimization.

## Your Task

1. **Read the conversation file** provided as an argument (from sample-conversations/ directory)

2. **Read the schema** at `data/conversation_schema.json` to understand the required structure

3. **Read the example** at `data/training_examples/conversation_001_imperva.json` to see the expected format

4. **Extract all relevant information** from the markdown conversation:
   - Customer name and context
   - All conversation turns (customer messages)
   - Technical requirements mentioned
   - Service type and complexity
   - Assumptions made by pre-sales engineer
   - Quote details and line items
   - Outcome and workflow decisions

5. **Infer the expected agent behavior**:
   - What tool calls should the agent make?
   - What should be in the agent state?
   - What workflow decision should be made?
   - Should clarifying questions be asked?
   - What assumptions are reasonable?
   - If service type is ambiguous (e.g., "backup circuit", "100mb connection"), document the disambiguation needed

6. **Generate structured JSON** following the schema exactly

7. **Save the output** to `data/training_examples/conversation_XXX_customername.json`

## Important Guidelines

- **Be thorough**: Extract ALL technical requirements from the customer message
- **Be explicit**: Define expected tool calls with complete parameters
- **Document assumptions**: List all assumptions that should be made and WHY
- **Handle ambiguity**: If service type is unclear, document the disambiguation strategy
- **Multi-turn conversations**: If the conversation has multiple back-and-forth exchanges, create separate turns for each
- **Quote details**: Extract line items as structured data, not just image references
- **Service disambiguation**: For terms like "backup circuit" (wireless vs fixed), "new cable" (cross-connect), document the correct interpretation

## Special Cases to Handle

### Service Type Ambiguity
- "backup circuit" → could be wireless 4G/5G OR fixed-line fiber
- "100mb connection" → generic internet service (not IP Transit or DIA unless specified)
- "new cable" → cross-connect in data center context

### Multi-Turn Conversations
For conversations with corrections or clarifications (e.g., Conversation 2 where first quote was wrong):
- Create separate turns for each customer message
- Document what went wrong in earlier turns
- Show the corrected expected behavior

### Complex Quotes
For RFP or multi-site quotes (e.g., Conversation 5):
- Mark as complexity_level: "complex"
- expected_workflow_decision: "send_to_sales_team" or "ask_clarifying_questions"
- Document pre-qualification requirements

## Example Usage

```bash
/convert_conversation sample-conversations/conversation-1.md
/convert_conversation sample-conversations/conversation-10.md
```

## Output Format

After conversion, you should:
1. Display a summary of what was extracted
2. Show the output file path
3. List any areas that need manual review or clarification
4. Suggest if this conversation is good for GEPA training or needs more annotation

## Validation checklist

Validate data quality meets the requirements in the Data Quality checklist in `docs/training-data-quality-checklist.md`.

---

**Now convert the conversation file provided as an argument.**
