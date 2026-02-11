import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface ImmediateFollowupEmailProps {
  name: string;
  businessName: string;
  suburb?: string;
  jobType?: string;
}

export const ImmediateFollowupEmail = ({
  name,
  businessName,
  suburb,
  jobType,
}: ImmediateFollowupEmailProps) => {
  return (
      <Html>
      <Head />
      <Preview>TradieFlow setup request received</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Thanks for requesting TradieFlow</Heading>
          
          <Text style={text}>Hi {name},</Text>
          
          <Text style={text}>
            We received your setup request for {jobType?.replace('_', ' ') || 'cleaning services'} in {suburb || 'your service area'}.
          </Text>

          <Text style={text}>
            <strong>To set up your workspace, please reply with:</strong>
          </Text>

          <Section style={list}>
            <Text style={listItem}>* Team size (solo, 2-5, or 6+ cleaners)</Text>
            <Text style={listItem}>* Main services you want to prioritize</Text>
            <Text style={listItem}>* Best contact number for onboarding</Text>
            <Text style={listItem}>* Preferred time for a quick setup call</Text>
          </Section>

          <Text style={text}>
            We&apos;ll configure your TradieFlow workspace and send your next steps within one business day.
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            {businessName}<br />
            Reply to this email to continue onboarding
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default ImmediateFollowupEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 40px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 40px',
};

const list = {
  padding: '0 40px',
};

const listItem = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '4px 0',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  padding: '0 40px',
};
