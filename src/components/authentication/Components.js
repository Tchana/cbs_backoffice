import styled from 'styled-components';
import themes from "../../../tailwind.config.js"

export const Container = styled.div`
    background-color: #F5F3FF;
    border-radius: 30px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.35);
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    overflow: hidden;
    width: 768px;
    max-width: 100%;
    min-height: 480px;
`;

export const SignUpContainer = styled.div`
    position: absolute;
    top: 0;
    height: 100%;
    transition: all 0.6s ease-in-out;
    left: 0;
    width: 50%;
    opacity: 0;
    z-index: 1;
    ${({ $signIn }) => !$signIn && `
        transform: translateX(100%);
        opacity: 1;
        z-index: 5;
    `}
`;

export const SignInContainer = styled.div`
    position: absolute;
    top: 0;
    height: 100%;
    transition: all 0.6s ease-in-out;
    left: 0;
    width: 50%;
    z-index: 2;
    ${({ $signIn }) => !$signIn && `transform: translateX(100%); opacity: 0;`}
`;

export const Form = styled.form`
    background-color: #F5F3FF;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    padding: 0 40px;
    height: 100%;
`;

export const Title = styled.h1`
    font-weight: bold;
    margin: 0;
`;

export const Input = styled.input`
    background-color: #EDE9FE;
    border: none;
    margin: 8px 0;
    padding: 10px 15px;
    font-size: 13px;
    border-radius: 8px;
    width: 100%;
    outline: none;
`;

export const Select = styled.select`
    background-color: #EDE9FE;
    border: none;
    margin: 8px 0;
    padding: 10px 15px;
    font-size: 13px;
    border-radius: 8px;
    width: 100%;
    outline: none;
`;

export const Button = styled.button`
    background-color: ${themes.theme.extend.colors.secondary[500]};
    color: #FFFFFF;
    font-size: 12px;
    padding: 10px 45px;
    border: 1px solid transparent;
    border-radius: 8px;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    margin-top: 10px;
    cursor: pointer;
    transition: background-color 0.2s ease-in-out, transform 0.1s;
    &:active {
        background-color: ${themes.theme.extend.colors.secondary[400]};
        transform: scale(0.98);
    }
`;

export const GhostButton = styled(Button)`
    background-color: transparent;
    border-color: #FFFFFF;
`;

export const Anchor = styled.a`
    color: #291F1E;
    font-size: 13px;
    text-decoration: none;
    margin: 15px 0 10px;
`;

export const OverlayContainer = styled.div`
    position: absolute;
    top: 0;
    left: 50%;
    width: 50%;
    height: 100%;
    overflow: hidden;
    transition: all 0.6s ease-in-out;
    border-radius: 150px 0 0 100px;
    z-index: 1000;
    ${({ $signIn }) => !$signIn && `transform: translateX(-100%); border-radius: 0 150px 100px 0;`}
`;

export const Overlay = styled.div`
    background: linear-gradient(to right, ${themes.theme.extend.colors.primary[500]}, ${themes.theme.extend.colors.secondary[500]});
    color: #FFFFFF;
    position: relative;
    left: -100%;
    height: 100%;
    width: 200%;
    transform: translateX(0);
    transition: all 0.6s ease-in-out;
    ${({ $signIn }) => !$signIn && `transform: translateX(50%);`}
`;

export const OverlayPanel = styled.div`
    position: absolute;
    width: 50%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    padding: 0 30px;
    text-align: center;
    top: 0;
    transform: translateX(0);
    transition: all 0.6s ease-in-out;
`;

export const LeftOverlayPanel = styled(OverlayPanel)`
    transform: translateX(-200%);
    ${({ $signIn }) => !$signIn && `transform: translateX(0);`}
`;

export const RightOverlayPanel = styled(OverlayPanel)`
    right: 0;
    transform: translateX(0);
    ${({ $signIn }) => !$signIn && `transform: translateX(200%);`}
`;

export const Paragraph = styled.p`
    font-size: 14px;
    line-height: 20px;
    letter-spacing: 0.3px;
    margin: 20px 0;
`;
