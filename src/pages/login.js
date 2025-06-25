import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    Container,
    SignUpContainer,
    SignInContainer,
    Form,
    Title,
    Input,
    Button,
    GhostButton,
    Anchor,
    OverlayContainer,
    Overlay,
    OverlayPanel,
    LeftOverlayPanel,
    RightOverlayPanel,
    Paragraph
} from '../components/authentication/Components';

const Login = () => {
    const [signIn, setSignIn] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setError('');
            setLoading(true);
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError('Failed to sign in');
        }
        setLoading(false);
    };

    return (
        <Container>
            <SignUpContainer $signIn={signIn}>
                <Form onSubmit={handleSubmit}>
                    <Title>Sign In</Title>
                    {error && <div className="text-red-500 mb-4">{error}</div>}
                    <Input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <Input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <Button type="submit" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </Button>
                </Form>
            </SignUpContainer>

            <SignInContainer $signIn={signIn}>
                <Form>
                    <Title>Welcome Back!</Title>
                    <Paragraph>Enter your personal details to use all of site features</Paragraph>
                    <GhostButton onClick={() => setSignIn(true)}>Sign In</GhostButton>
                </Form>
            </SignInContainer>

            <OverlayContainer $signIn={signIn}>
                <Overlay $signIn={signIn}>
                    <LeftOverlayPanel $signIn={signIn}>
                        <Title>Welcome Back!</Title>
                        <Paragraph>To keep connected with us please login with your personal info</Paragraph>
                        <GhostButton onClick={() => setSignIn(true)}>Sign In</GhostButton>
                    </LeftOverlayPanel>

                    <RightOverlayPanel $signIn={signIn}>
                        <Title>Hello, Friend!</Title>
                        <Paragraph>Enter your personal details and start journey with us</Paragraph>
                        <GhostButton onClick={() => setSignIn(false)}>Sign Up</GhostButton>
                    </RightOverlayPanel>
                </Overlay>
            </OverlayContainer>
        </Container>
    );
};

export default Login; 