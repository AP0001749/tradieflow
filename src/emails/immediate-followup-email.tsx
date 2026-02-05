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
      <Preview>Got your cleaning request -- quick question</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Thanks for your cleaning request!</Heading>
          
          <Text style={text}>Hi {name},</Text>
          
          <Text style={text}>
            We got your request for {jobType?.replace('_', ' ')} in {suburb || 'your area'}.
          </Text>

          <Text style={text}>
            <strong>To confirm your booking, please reply with:</strong>
          </Text>

          <Section style={list}>
            <Text style={listItem}>* Full address (street, suburb, postcode)</Text>
            <Text style={listItem}>* Number of bedrooms and bathrooms</Text>
            <Text style={listItem}>* Preferred date and time</Text>
            <Text style={listItem}>* Any special requirements</Text>
          </Section>

          <Text style={text}>
            We'll get back to you within a few hours with availability and pricing.
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            {businessName}<br />
            Reply to this email to confirm your booking
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
