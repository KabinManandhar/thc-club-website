-- Update platform_content with Origins and FAQs
UPDATE platform_content 
SET 
  terms_conditions = '# our origins

this didn’t start as an idea. it started as frustration.

before thc club, we were on the other side of the counter—trying to sell our own products.
what we found was simple: visibility wasn’t earned, it was taxed.

most stores asked for 20% to 35% commission.
at that point, they weren’t just a platform—they were silent partners without the risk, without the paperwork.

we tried a different approach.
we asked for something smaller. a fixed space. lower commission. room to experiment.

no one agreed.

so we stopped asking.

kathmandu is full of creators building genuinely great products—out of bedrooms, small kitchens, late nights.
but getting discovered? that’s a different game entirely. expensive shelves, algorithm dependency, or both.

that gap—between creating and being seen—is where most brands die.

the hidden collective club was built to close that gap.

not by taking a bigger cut, but by changing the model entirely.

we offer space, visibility, shared footfall, and real-world presence—without turning creators into margin for someone else.

you bring the product.
we make sure it gets seen.

simple.',
  faqs = '[
    {
      "question": "why do you charge both rent and a processing fee?",
      "answer": "to keep entry costs low while sharing the upside. traditional models take 35% commission regardless. we provide a fixed space for visibility, and our performance fee only scales if your sales do. it ensures we are both invested in your brand s success."
    },
    {
      "question": "how often should i refresh my stock?",
      "answer": "we recommend a refresh at least once every 21 days. this keeps the collective vibe fresh for our regulars and ensures your display always looks its best. you can coordinate stock drops directly through your dashboard."
    },
    {
      "question": "what is the rent waiver program?",
      "answer": "we reward high-performing brands. if your monthly sales cross rs. 50,000, we waive 50% to 100% of your next month s rent. it s our way of saying keep up the great work."
    },
    {
      "question": "what does the registration fee cover?",
      "answer": "the one-time rs. 800 fee covers your digital onboarding, physical shelf setup, and initial identity verification. it ensures every brand in the collective meets our curation standards."
    },
    {
      "question": "how are payouts handled?",
      "answer": "currently, payouts are processed monthly. you can track your estimated net payout in real-time via the payouts tab in your dashboard."
    }
  ]'::jsonb,
  updated_at = now()
WHERE id = 1;
