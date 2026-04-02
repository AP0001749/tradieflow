import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from '@react-email/components';

interface TwentyFourHourFollowupEmailProps {
  name: string;
  businessName: string;
  jobType?: string;
}

export const TwentyFourHourFollowupEmail = ({
  name,
  businessName,
  jobType,
}: TwentyFourHourFollowupEmailProps) => {
  return (
      <Html>
      <Head />
      <Preview>Quick follow-up - ready to set up TradieFlow?</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Quick follow-up</Heading>
          
          <Text style={text}>Hi {name},</Text>
          
          <Text style={text}>
            Just checking in on your TradieFlow setup request for {jobType?.replace('_', ' ') || 'your trade business'}.
          </Text>

          <Text style={text}>
            <strong>Ready to get started?</strong> Reply &ldquo;YES&rdquo; and share the best time to map your missed-call and follow-up workflow.
          </Text>

          <Text style={text}>
            If timing changed or you no longer need help, just reply and I&apos;ll close the request.
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            {businessName}<br />
            Reply to this email to continue setup
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default TwentyFourHourFollowupEmail;

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
