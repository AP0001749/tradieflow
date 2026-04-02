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

interface FortyEightHourFollowupEmailProps {
  name: string;
  businessName: string;
}

export const FortyEightHourFollowupEmail = ({
  name,
  businessName,
}: FortyEightHourFollowupEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Last check-in - should I close your setup request?</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Last check-in</Heading>
          
          <Text style={text}>Hi {name},</Text>
          
          <Text style={text}>
            I haven&apos;t heard back about your TradieFlow setup request.
          </Text>

          <Text style={text}>
            <strong>Reply &ldquo;YES&rdquo; if you still want to plug missed-call leaks and get set up</strong> - otherwise I&apos;ll close this request.
          </Text>

          <Text style={text}>
            No pressure either way. If you want to start later, just reply and we can reopen it anytime.
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            {businessName}<br />
            Reply to this email if you still want setup
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default FortyEightHourFollowupEmail;

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
