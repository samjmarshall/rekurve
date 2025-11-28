# **Strategic Analysis of AI-Driven Sales Automation: Capacity Expansion and Conversion Optimization for Devoli**

## **1\. Executive Strategic Assessment**

The telecommunications wholesale sector, particularly within the New Zealand and Australian markets, is undergoing a profound structural shift. As Retail Service Providers (RSPs) and Managed Service Providers (MSPs) face increasing pressure to deliver instantaneous connectivity solutions to their end-users, the upstream wholesale partners—companies like Devoli—are finding that operational velocity is no longer merely a service metric but a primary determinant of market share. This report provides an exhaustive analysis of the proposed AI Agent solution for Devoli, a B2B Internet Service Provider that has identified a critical bottleneck in its sales qualification and quoting workflow.

Currently, Devoli operates with a high-friction, manual sales process that results in a "speed to lead" of 3-6 business days. Despite this latency, the organization maintains a conversion rate of 35% on approximately 30 service quote requests per month. This conversion rate, while seemingly robust, masks a significant opportunity cost driven by capacity constraints and the non-linear decay of lead value over time. The proposed solution—an AI Agent capable of qualifying leads, extracting requirements, autonomously negotiating missing information, and generating quotes for staff review—represents a fundamental decoupling of revenue growth from headcount.

Our analysis utilizes extensive industry benchmarks, academic research on "speed to lead" dynamics, and comparative case studies from the global telecommunications sector. The data suggests that by compressing the response cycle from days to minutes, Devoli can expect a multiplier effect on lead qualification rates, a significant expansion in effective capacity (potentially exceeding 10x current volumes), and a measurable lift in conversion rates driven by the "first responder" advantage inherent in commoditized B2B markets.

### **1.1 The Market Context: The Wholesale Imperative**

Devoli occupies a strategic niche as a "wholesale-only" aggregator, providing white-label broadband, voice, and mobile services to RSPs and MSPs.1 This model relies heavily on the trust and efficiency of the partner ecosystem. RSPs do not own the infrastructure; they rely on Devoli’s ability to interface with Local Fibre Companies (LFCs) and carriers. Consequently, Devoli’s operational speed becomes the RSP’s operational speed. If Devoli takes four days to quote a fibre circuit, the RSP must delay their proposal to the end customer by four days, creating a vulnerability where competitors with automated quoting tools can intercede.3 The industry trend is aggressively moving toward "zero-touch" provisioning and quoting, as evidenced by major players like One NZ (formerly Vodafone NZ) and Orange Polska investing heavily in catalog-driven architecture and Robotic Process Automation (RPA) to reduce cycle times.3

---

## **2\. Operational Baseline and the Latency Crisis**

To accurately forecast the impact of the AI solution, it is necessary to rigorously deconstruct Devoli’s current operational state. The existing metrics paint a picture of an organization that is successful *despite* its processes, rather than because of them, driven largely by the high intent of its specialized customer base.

### **2.1 The Cost of the 3-6 Day Cycle**

The current speed to lead of 3-6 business days is the single most critical inhibitor to Devoli’s growth. In the context of modern B2B sales, a delay of this magnitude is functionally equivalent to a non-response for a significant segment of the market.

* **The Industry Standard Gap:** Research indicates that the average B2B response time is approximately 42 hours, yet even this average is considered poor practice in high-velocity tech sales.5  
* **The "Golden Window" Deviation:** A landmark study by Harvard Business Review and InsideSales.com established that the odds of qualifying a lead decrease by 10 times after the first five minutes.6 By operating on a timeline of *days* rather than *minutes*, Devoli is operating entirely outside the window of influence where buyer engagement is highest.  
* **The "Silent Churn" Phenomenon:** While Devoli converts 35% of the leads it quotes, there is no data on the leads that abandon the process during the 3-6 day wait. In B2B ecommerce and service procurement, "cart abandonment" due to slow delivery of information is a pervasive issue. 78% of B2B buyers purchase from the vendor that responds first.8 By responding on Day 4, Devoli essentially cedes the "first mover" advantage to any competitor capable of responding on Day 1, 2, or 3\.

### **2.2 The Anatomy of the Bottleneck**

The user indicates that Devoli is "at capacity" with 30 requests per month. This implies a startlingly high administrative burden per quote. If a sales team cannot handle more than one request per day, it suggests that the manual process involves:

1. **Complex Decoding:** Manually reading unstructured emails to decipher technical requirements (bandwidth, handover variants, etc.).  
2. **System Swiveling:** Manually logging into portals (like the Devoli specific platform mentioned in 10) to check address availability across different fibre networks (Chorus, Enable, UFF, etc.).  
3. **Pricing Calculation:** Manually applying wholesale margins and volume discounts.  
4. **Drafting:** Creating the PDF or email proposal.  
5. **The "Ping-Pong" Effect:** The most time-consuming element is the 50% of leads with partial requirements. A human rep must email the client, wait for a reply, re-open the file, and proceed. This context switching destroys productivity.

### **2.3 Buyer Intent and the Conversion Anomaly**

The 35% conversion rate is exceptionally high compared to broader B2B benchmarks, which typically hover between 2-5% for website leads.11 This anomaly is best explained by the specific nature of Devoli’s clientele. RSPs and MSPs are not casual browsers; they are businesses with a specific, urgent need to source connectivity for their own clients. They are "high intent" buyers.  
However, this high conversion rate is likely suffering from survivorship bias. The 35% represents the portion of the 30 leads who survive the 3-6 day wait. It is highly probable that the true inbound volume could be higher, or that the "win rate" on the total addressable market of inquiries is lower because the most time-sensitive buyers (often the most valuable) have already moved on.

---

## **3\. Theoretical Framework: The Physics of Sales Velocity**

The proposed AI Agent solution operates on the principle of compressing time. To understand the magnitude of the improvement, we must apply the theoretical frameworks of "Speed to Lead" and "Response Decay" to the specific workflow steps defined in the user's query.

### **3.1 The 5-Minute Imperative**

The difference between a 3-day response and a 5-minute response is not linear; it is exponential.

* **Qualification Probability:** Leads contacted within 5 minutes are 21 times more likely to enter the qualification phase than those contacted after 30 minutes.6 For Devoli, this implies that the AI Agent’s immediate "Qualify" and "Extract" actions will drastically increase the number of leads that successfully enter the sales funnel.  
* **The Cliff of Indifference:** Interest drops off a "cliff" after 5 minutes. Waiting 10 minutes instead of 5 reduces qualification rates by 400%.14 Devoli’s current 3-6 day wait places them at the extreme tail of this distribution, where lead value is theoretically near zero unless the buyer has no other options.

### **3.2 The First Responder Advantage in B2B**

In commoditized markets—and wholesale broadband is partially commoditized—the vendor who provides the pricing information first frames the negotiation.

* **Preference Statistics:** 78% of buyers choose the vendor who responds first.5  
* **Trust Proxy:** In technical sales, speed is often interpreted as a proxy for competence. An RSP waiting for a quote infers that if the *sales* process is slow, the *provisioning* and *support* processes will also be slow.16 Conversely, an instant AI response signals a robust, API-driven backend, aligning with Devoli’s value proposition of "automation and API integration".18

### **3.3 The Human Capital Drain (70% Admin Load)**

Sales representatives typically spend only \~30% of their time actually selling; the remaining 70% is consumed by administrative tasks, data entry, and quote generation.19 Devoli’s current workflow is 100% administrative during the qualification and quoting phase. The AI solution targets exactly this inefficiency. By automating the extraction (Step 2\) and follow-up (Step 3), the AI reclaims the majority of the "busy work," allowing the human to intervene only at the high-value "Review" stage (Step 4).

---

## **4\. Analysis of the AI Agent Workflow**

The proposed solution involves a five-step workflow. We will analyze the impact of automation at each stage based on the provided performance metrics (100% qualification, 50% partial requirements, 10% auto-quote).

### **Step 1: Qualify (100% Success Rate)**

* **Current State:** Humans read every email to decide if it is a quote request.  
* **Future State:** AI performs this instantly.  
* **Impact:** While the success rate is 100% in both scenarios, the *latency* drops from days to seconds. This instantaneous acknowledgment ("We have received your request and are processing it...") manages customer expectations immediately, reducing anxiety and "double-dipping" (where customers email multiple vendors because they haven't heard back).

### **Step 2 & 3: Extract Requirements & Ask Follow-Up Questions (The Critical Pivot)**

This is the most transformative aspect of the solution. Currently, 50% of requests have partial requirements.

* **The "Ping-Pong" Elimination:** In a manual process, missing requirements trigger a multi-day delay loop:  
  * *Day 1:* Rep reads email, notes missing bandwidth.  
  * *Day 2:* Rep emails customer.  
  * *Day 3:* Customer replies.  
  * *Day 4:* Rep processes quote.  
* **The AI Acceleration:**  
  * *Minute 0:* Agent identifies missing bandwidth.  
  * *Minute 1:* Agent emails customer.  
  * *Minute 10:* Customer replies (customers are likely at their desk when they send the request).  
  * *Minute 11:* Agent extracts new data and generates quote.  
* **Strategic Insight:** This capability turns the AI into a **Sales Development Representative (SDR)**. It actively works the lead to maturity. By engaging the customer immediately while their intent is highest, the AI is far more likely to retrieve the missing information than a human rep emailing two days later when the customer has moved on to other tasks. This directly addresses the "partial requirement" stagnation that likely clogs Devoli’s current pipeline.

### **Step 4: Produce Quote for Devoli Staff Review**

The prompt notes that only 10% of requests currently reach this stage automatically (i.e., contain all info). This means 90% of leads require friction resolution.

* **The "Draft vs. Create" Paradigm:** The AI shifts the human role from *Creation* (data entry, checking APIs, typing) to *Review* (verifying the AI's output).  
* **Time Savings:** Creating a complex telecom quote manually might take 30-60 minutes (checking coverage maps, pricing tables). Reviewing a completed quote takes 2-5 minutes. This is the mathematical basis for the capacity expansion modeled in Section 5\.

### **Step 5: Escalation (The Safety Valve)**

The solution wisely includes an escalation path. This "Human-in-the-Loop" (HITL) design is essential for high-value B2B sales.

* **Risk Mitigation:** AI agents can struggle with nuance. Research shows agents have a \~58% success rate on simple tasks but lower on multi-step complex reasoning.22 By escalating when "stuck," Devoli ensures that high-value, complex, or non-standard requests (e.g., a massive multi-site WAN for a government client) are handled by experts, preventing the "AI loop of death" that frustrates customers.

---

## **5\. Capacity Expansion Modeling: The 12x Multiplier**

The user explicitly asks for the likely quote capacity improvement from the current baseline of 30 per month. We can model this by analyzing the time-cost per quote in the manual vs. AI-assisted scenarios.

### **5.1 The Efficiency Equation**

We assume the current team is "at capacity" with 30 quotes. Let us estimate the time burden. If a salesperson handles 1.5 quotes per working day (30/month) alongside other duties (account management, meetings), the *effective* time spent on the quoting lifecycle (including the back-and-forth emails for missing info) is likely significant.

**Manual Workflow Time Allocation (Estimated per Quote):**

* Initial Triage & Context Switching: 15 mins  
* Requirements Extraction & System Checks (Portals): 30 mins  
* Email Tag for Missing Info (Drafting/Reading replies): 30 mins (spread over days)  
* Final Quote Calculation & Document Creation: 45 mins  
* **Total Active Work Time:** \~2 Hours per quote.  
* *Note:* This aligns with the "at capacity" statement if the staff has limited hours allocated strictly to new business quoting vs. managing existing RSP relationships.

**AI-Assisted Workflow Time Allocation (Per Quote):**

* Triage: 0 mins (Automated)  
* Requirements Extraction: 0 mins (Automated)  
* Email Tag: 0 mins (Automated Negotiation)  
* Final Quote Review (Human Staff): 10 mins (Reviewing the AI generated draft for accuracy).  
* **Total Active Work Time:** \~10 Minutes per quote.

### **5.2 Capacity Multiplier Calculation**

* **Efficiency Gain:** Moving from 120 minutes per quote to 10 minutes per quote represents a **12x (1200%)** efficiency gain in the processing phase.  
* Theoretical Capacity: If the current staff resources can handle 30 quotes/month (manual), the same resource pool, utilizing the AI Agent to handle the heavy lifting of extraction and drafting, could theoretically review and approve:

  $$30 \\text{ quotes} \\times 12 \= 360 \\text{ quotes per month}$$

### **5.3 Beyond the Theoretical**

While the math suggests a 12x increase, real-world friction (complex escalations, AI errors requiring correction) will temper this.

* **Escalation Drag:** If the AI escalates complex cases (Step 5), these still require manual work. However, even if 20% of quotes are escalated and take full manual time, the weighted average time-cost drops precipitously.  
* **Operational Bottleneck Migration:** The bottleneck will shift from *Sales Qualification* to *Service Delivery*. Devoli must ensure that if sales capacity increases to 360/month, the Operations team can actually provision those circuits. However, from a strictly *pre-sales quoting* perspective, the bottleneck is effectively removed.

**Table 1: Projected Capacity Improvements**

| Metric | Current Manual State | Future AI-Assisted State | Improvement Factor |
| :---- | :---- | :---- | :---- |
| **Active Time per Quote** | \~120 Minutes | \~10 Minutes (Review Only) | **12x** |
| **Monthly Capacity** | 30 Quotes | \~360 Quotes | **1200%** |
| **Admin Load on Staff** | High (Data Entry/Emailing) | Low (Strategic Review) | **Strategic Shift** |
| **Scalability** | Linear (Requires Hiring) | Elastic (Software Scale) | **Exponential** |

---

## **6\. Impact on Conversion Rate**

The current conversion rate of 35% is a strong baseline, indicative of high buyer intent. However, the introduction of speed and automation will exert positive pressure on this metric through several causal mechanisms.

### **6.1 The Mechanics of Conversion Lift**

1. **Capture of "At-Risk" Leads:** Currently, leads that require immediate answers likely churn to competitors during the 3-6 day wait. By responding instantly, Devoli captures 100% of the intent window.  
2. **The "Partial Requirements" Recovery:** The 50% of leads with missing info are the most vulnerable to drop-off. A human might delay following up on these difficult emails. The AI pursues them instantly and relentlessly (but politely). Recovering even a fraction of these stalled leads directly boosts the denominator of qualified opportunities.  
3. **The Competence Signal:** For RSPs, choosing a wholesale partner is a technical decision. An instant, accurate quote proves that Devoli has mastered its data and APIs. This builds confidence that Devoli is a "low-touch" partner, which is exactly what MSPs seek to protect their own margins.10

### **6.2 Quantitative Projections**

Research suggests that fast responders secure 35-50% more sales 9 and responding within 1 minute can improve conversion by 391%.15 While a 391% increase on a 35% base is mathematically impossible (exceeding 100%), we can project a significant lift in the *effective* close rate.

* **Scenario A (Conservative):** Conversion rises to **40-45%**. The speed eliminates churn from impatient buyers, but price/availability remain the primary decision factors.  
* **Scenario B (Optimistic):** Conversion rises to **50-60%**. Devoli becomes the "default" option for RSPs because it is the *easiest* to get a price from. In wholesale, "ease of doing business" is often a tie-breaker.

**Table 2: Conversion Rate Impact Analysis**

| Driver | Mechanism | Projected Impact |
| :---- | :---- | :---- |
| **Speed to Lead** | Shifts response from Day 4 to Minute 1\. Captures "First Responder" preference (78% of buyers). | **High Positive** |
| **Lead Nurture** | AI automates follow-up on the 50% of partial leads, preventing them from going cold. | **Medium Positive** |
| **Customer Experience** | "Zero-touch" experience aligns with RSP desire for automation and API integration.18 | **High Positive** |
| **Projected Rate** | **From 35% to \~50%** | **\+15 Percentage Points** |

---

## **7\. Strategic Analysis: Competitive Advantage in the NZ/AU Market**

The implementation of this AI solution does more than just fix a workflow; it positions Devoli strategically against its competitors in the ANZ telecommunications landscape.

### **7.1 The "Wholesale-Only" Moat**

Devoli competes against incumbents (like Spark Wholesale, Chorus) and other aggregators. Incumbents are often characterized by legacy systems, slow manual processes, and complex bureaucracy.2 By implementing an AI Agent that interfaces with the "purpose-built software platform" 1, Devoli creates a "technological moat."

* **Differentiation:** Small to mid-sized MSPs often feel neglected by large telco incumbents. An AI tool that gives them instant attention—regardless of their size—democratizes the service experience, engendering deep loyalty.  
* **Scalability for Partners:** Devoli’s promise is to help RSPs "scale up quickly".1 If an RSP launches a marketing campaign and generates 50 leads in a week, Devoli’s current 3-day delay would bottle-neck the RSP’s campaign. The AI Agent ensures Devoli can absorb the RSP’s growth spikes without friction.

### **7.2 Comparison with Global Best Practices**

Global case studies validate this approach:

* **One NZ (Vodafone):** Shifted to catalog-driven architecture to reduce time-to-market and quote times, resulting in massive efficiency gains.3  
* **Orange Polska:** Used automation (RPA) to handle broadband delivery, reducing handling time and increasing accuracy.4  
* **Cognizant Case Study:** An Australian telco used bots to automate order building, allowing them to reduce BPO reliance and improve cycle time.23

Devoli’s move is consistent with the behavior of top-tier global operators, signaling maturity and stability to its investor base and partners.

---

## **8\. Implementation Risks and Requirements**

While the upside is clear, the implementation must navigate specific risks associated with AI in B2B contexts.

### **8.1 The "Hallucination" Risk in Pricing**

AI models can sometimes "hallucinate" numbers. In telecom, quoting a price of $50 when the real wholesale cost is $80 is a disastrous error.

* **Mitigation:** The AI must not *calculate* the price using its LLM weights. It must *extract* the parameters (Address: 123 Queen St, Service: 1Gbps) and pass them to Devoli’s existing deterministic pricing API/Database.10 The AI acts as the *interface*, not the *calculator*. The workflow step "Produce a quote for Devoli staff review" is the critical safeguard here. Staff must verify the pricing before it goes to the customer, at least in the initial rollout phase.

### **8.2 Handling Unstructured Complexity**

50% of emails have partial requirements. The AI’s ability to ask the *right* follow-up question is key.

* **Requirement:** The AI must be prompted with specific constraints. If a user asks for "Internet," the AI must know to ask "Is this for a residential or business address?" and "Do you require UFB Fibre or VDSL?" The prompt engineering here defines the success of the solution.

### **8.3 Integration with Devoli Platform**

The research highlights Devoli’s "One-stop portal" and "APIs".10 The AI Agent should ideally be integrated to trigger these APIs. If the AI is merely a chatbot that doesn't connect to the backend coverage check, it will be limited. The ultimate goal should be for the AI to perform the "Pre-qualify and order internet services" 10 function autonomously.

---

## **9\. Conclusion and Recommendations**

The analysis confirms that Devoli’s deployment of an AI Agent for Sales Qualified Leads is a high-leverage strategic initiative that addresses the organization's primary growth constraint. The transition from a manual, linear sales capacity model to an automated, exponential one will profoundly alter the unit economics of Devoli’s pre-sales operations.

**Key Findings:**

1. **Speed is the Strategy:** Reducing "speed to lead" from 3-6 days to minutes allows Devoli to capitalize on the "Golden Window" of lead qualification, increasing the probability of engagement by up to **21x**.  
2. **Capacity Unlocked:** The solution effectively removes the human bottleneck from the qualification and drafting phases. We project a **12x increase in quote processing capacity**, allowing the existing team to handle \~360 quotes/month (up from 30\) by shifting their focus from data entry to strategic review.  
3. **Conversion Uplift:** Driven by the "First Responder" advantage and the automated nurture of leads with partial requirements, we project the conversion rate to improve from **35% to \~50%**.  
4. **Operational Resilience:** The AI acts as a 24/7 SDR, ensuring that no lead is lost to the "ping-pong" delay of missing information, which currently effects 50% of inbound volume.

**Recommendations:**

* **Prioritize the API Connection:** Ensure the AI agent is not just conversational but integrated with Devoli’s coverage check APIs to ensure quote accuracy.  
* **Monitor the "Partial" Cohort:** Closely track the conversion rate of the 50% of leads that require follow-up. This is the area of highest potential lift.  
* **redefine Staff KPIs:** Shift staff metrics from "Number of Quotes Created" to "Speed of Review" and "RSP Relationship Depth," as the AI will now handle the volume creation.

By implementing this solution, Devoli aligns itself with the future of B2B telecommunications—automated, instant, and scalable—securing its position as the partner of choice for RSPs and MSPs in the region.

#### **Works cited**

1. Wholesale Broadband Internet \- RSPs \- Devoli, accessed on November 24, 2025, [https://devoli.com/wholesale-broadband-for-rsps](https://devoli.com/wholesale-broadband-for-rsps)  
2. Why Choose a Wholesale-Focused Telco Partner? \- Devoli, accessed on November 24, 2025, [https://devoli.com/blog/why-choose-a-wholesale-only-telco-partner](https://devoli.com/blog/why-choose-a-wholesale-only-telco-partner)  
3. Revenue-Generating Quote-to-Order Process Vs. Deal Killers \- CSG, accessed on November 24, 2025, [https://www.csgi.com/insights/revenue-generating-quote-to-order-process-vs-deal-killers/](https://www.csgi.com/insights/revenue-generating-quote-to-order-process-vs-deal-killers/)  
4. RPA Use Case in Telecom \- AIS Automation Journey \- UiPath, accessed on November 24, 2025, [https://www.uipath.com/resources/automation-case-studies/ais-improving-customer-service-through-rpa](https://www.uipath.com/resources/automation-case-studies/ais-improving-customer-service-through-rpa)  
5. How instant leads drive sales success: speed to lead statistics \- Amplemarket, accessed on November 24, 2025, [https://www.amplemarket.com/blog/how-to-win-deals-faster-speed-to-lead-statistics-you-need-to-know](https://www.amplemarket.com/blog/how-to-win-deals-faster-speed-to-lead-statistics-you-need-to-know)  
6. The Modern Rules of Lead Response Time \- LeanData, accessed on November 24, 2025, [https://www.leandata.com/blog/the-modern-rules-of-lead-response-time/](https://www.leandata.com/blog/the-modern-rules-of-lead-response-time/)  
7. From Minutes to Seconds: The Impact of Speed-to-Lead Automation on Customer Experience and Revenue Growth \- SuperAGI, accessed on November 24, 2025, [https://superagi.com/from-minutes-to-seconds-the-impact-of-speed-to-lead-automation-on-customer-experience-and-revenue-growth/](https://superagi.com/from-minutes-to-seconds-the-impact-of-speed-to-lead-automation-on-customer-experience-and-revenue-growth/)  
8. How Faster Lead Response Times Can Skyrocket Conversions \- Voiso, accessed on November 24, 2025, [https://voiso.com/articles/lead-response-time-metrics/](https://voiso.com/articles/lead-response-time-metrics/)  
9. What Is Speed to Lead? Statistics, Strategies, and Software to Improve Response Time \- LeadAngel, accessed on November 24, 2025, [https://www.leadangel.com/blog/operations/speed-to-lead-statistics/](https://www.leadangel.com/blog/operations/speed-to-lead-statistics/)  
10. Managed Service Providers \- MSP Growth Solutions \- Devoli, accessed on November 24, 2025, [https://devoli.com/managed-service-providers](https://devoli.com/managed-service-providers)  
11. B2B Conversion Rate: 5 Strategies to Improve Performance in 2025 \- Martal Group, accessed on November 24, 2025, [https://martal.ca/b2b-conversion-rate-lb/](https://martal.ca/b2b-conversion-rate-lb/)  
12. B2B Digital Marketing Benchmarks 2025: ROI Metrics & How Top Teams Outperform, accessed on November 24, 2025, [https://martal.ca/b2b-digital-marketing-benchmarks-lb/](https://martal.ca/b2b-digital-marketing-benchmarks-lb/)  
13. B2B Sales Conversion Rate by Industry 2025 (New Data) \- SERPsculpt, accessed on November 24, 2025, [https://serpsculpt.com/reports/b2b-sales-conversion-rate-by-industry/](https://serpsculpt.com/reports/b2b-sales-conversion-rate-by-industry/)  
14. BEST LEAD-TO-SALE CONVERSION STATISTICS 2025 \- Amra & Elma, accessed on November 24, 2025, [https://www.amraandelma.com/lead-to-sale-conversion-statistics/](https://www.amraandelma.com/lead-to-sale-conversion-statistics/)  
15. Speed to Lead Response Time Statistics That Drive Conversions \- Kixie, accessed on November 24, 2025, [https://www.kixie.com/sales-blog/speed-to-lead-response-time-statistics-that-drive-conversions/](https://www.kixie.com/sales-blog/speed-to-lead-response-time-statistics-that-drive-conversions/)  
16. 43 Conversion Rate Optimization Statistics \[2025\] \- VWO, accessed on November 24, 2025, [https://vwo.com/conversion-rate-optimization/conversion-rate-optimization-statistics/](https://vwo.com/conversion-rate-optimization/conversion-rate-optimization-statistics/)  
17. 107 Customer Service Statistics and Facts You Shouldn't Ignore \- Help Scout, accessed on November 24, 2025, [https://www.helpscout.com/75-customer-service-facts-quotes-statistics/](https://www.helpscout.com/75-customer-service-facts-quotes-statistics/)  
18. Devoli \- Internet & Network Solutions for RSPs & MSPs | Devoli, accessed on November 24, 2025, [https://devoli.com/](https://devoli.com/)  
19. 149+ Eye-Opening Sales Statistics to Consider in 2025 – By Category \- SPOTIO, accessed on November 24, 2025, [https://spotio.com/blog/sales-statistics/](https://spotio.com/blog/sales-statistics/)  
20. C'mon It's 2025: Give Salespeople Back Their Selling Time\!, accessed on November 24, 2025, [https://www.butlerstreet.com/post/c-mon-it-s-2025-give-salespeople-back-their-selling-time](https://www.butlerstreet.com/post/c-mon-it-s-2025-give-salespeople-back-their-selling-time)  
21. How Much Time Should Sales Reps Spend Selling? \- Abstrakt Marketing Group, accessed on November 24, 2025, [https://www.abstraktmg.com/how-much-time-do-sales-reps-spend-selling/](https://www.abstraktmg.com/how-much-time-do-sales-reps-spend-selling/)  
22. Study shows AI agents struggle with CRM and confidentiality \- MarTech, accessed on November 24, 2025, [https://martech.org/study-shows-ai-agents-struggle-with-crm-and-confidentiality/](https://martech.org/study-shows-ai-agents-struggle-with-crm-and-confidentiality/)  
23. RPA Saves Telecom Company $4.9M \- Cognizant, accessed on November 24, 2025, [https://www.cognizant.com/us/en/case-studies/telecom-robotic-process-automation](https://www.cognizant.com/us/en/case-studies/telecom-robotic-process-automation)