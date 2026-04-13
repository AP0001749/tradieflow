do $$
declare
  quote_without_stop text := 'Hey {{contact_name}}, just checking if you had any questions about the install or repair quote for {{job_title}}. Reply here and {{business_name}} will help you lock in the next step.';
  quote_with_stop text := 'Hey {{contact_name}}, just checking if you had any questions about the install or repair quote for {{job_title}}. Reply here and {{business_name}} will help you lock in the next step. Reply STOP to opt out.';
  review_without_stop text := 'Hi {{contact_name}}, thanks again for choosing {{business_name}}. If the job went well, could you leave us a quick 5-star Google review? It really helps local customers trust us in an emergency. {{google_review_url}}';
  review_with_stop text := 'Hi {{contact_name}}, thanks again for choosing {{business_name}}. If the job went well, could you leave us a quick 5-star Google review? It really helps local customers trust us in an emergency. {{google_review_url}} Reply STOP to opt out.';
begin
  update public.business_profile
  set quote_followup_template = quote_with_stop
  where quote_followup_template is null
    or trim(quote_followup_template) = ''
    or quote_followup_template = quote_without_stop;

  update public.business_profile
  set review_request_template = review_with_stop
  where review_request_template is null
    or trim(review_request_template) = ''
    or review_request_template = review_without_stop;

  alter table public.business_profile
    alter column quote_followup_template set default 'Hey {{contact_name}}, just checking if you had any questions about the install or repair quote for {{job_title}}. Reply here and {{business_name}} will help you lock in the next step. Reply STOP to opt out.';

  alter table public.business_profile
    alter column review_request_template set default 'Hi {{contact_name}}, thanks again for choosing {{business_name}}. If the job went well, could you leave us a quick 5-star Google review? It really helps local customers trust us in an emergency. {{google_review_url}} Reply STOP to opt out.';
end $$;
