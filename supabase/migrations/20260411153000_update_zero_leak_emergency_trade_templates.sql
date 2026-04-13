do $$
declare
  old_quote_template_one text := 'Hi {{contact_name}}, just checking if you had any questions about the quote from {{business_name}}. Reply here if you''d like to go ahead.';
  old_quote_template_two text := 'Hey {{contact_name}}, just checking if you had any questions about the quote from {{business_name}}. Happy to run you through the job before you make a call - just reply here.';
  new_quote_template text := 'Hey {{contact_name}}, just checking if you had any questions about the install or repair quote for {{job_title}}. Reply here and {{business_name}} will help you lock in the next step.';
  old_review_template_one text := 'Hi {{contact_name}}, thanks for choosing {{business_name}}. If the job went well, would you mind leaving a quick Google review? {{google_review_url}}';
  old_review_template_two text := 'Hi {{contact_name}}, thanks for choosing {{business_name}}. If the job went well, would you mind leaving a quick Google review? It really helps. {{google_review_url}}';
  new_review_template text := 'Hi {{contact_name}}, thanks again for choosing {{business_name}}. If the job went well, could you leave us a quick 5-star Google review? It really helps local customers trust us in an emergency. {{google_review_url}}';
begin
  update public.business_profile
  set quote_followup_template = new_quote_template
  where quote_followup_template is null
    or trim(quote_followup_template) = ''
    or quote_followup_template in (old_quote_template_one, old_quote_template_two);

  update public.business_profile
  set review_request_template = new_review_template
  where review_request_template is null
    or trim(review_request_template) = ''
    or review_request_template in (old_review_template_one, old_review_template_two);

  alter table public.business_profile
    alter column quote_followup_template set default 'Hey {{contact_name}}, just checking if you had any questions about the install or repair quote for {{job_title}}. Reply here and {{business_name}} will help you lock in the next step.';

  alter table public.business_profile
    alter column review_request_template set default 'Hi {{contact_name}}, thanks again for choosing {{business_name}}. If the job went well, could you leave us a quick 5-star Google review? It really helps local customers trust us in an emergency. {{google_review_url}}';
end $$;
