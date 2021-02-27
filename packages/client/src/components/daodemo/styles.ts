import common_styles from '../widget/common_style';

export const colors = {
    dark: '#232323',
    medium: '#484D4E',
    light: '#EDF2F2',
    purple: '#9B18EF',
    nervos_green: '#00CC9B',
    light_green: '#18EFB1',
    indigo: '#5700FF',
}

export default {
    PanelCard: {
        color: colors.dark,
        minHeight: '500px',
        border: '1px solid gray',
        borderRadius: '20px',
        padding: '1em',
        background: colors.light,
        boxShadow: `3px 3px 5px gray, -3px -3px 5px ${colors.medium}`,
    },
    input_wrap: {
        padding: '5px 10px',
        marginBottom: '10px',
        display: 'block',
        background: 'white',
    },
    input: {
        width: '100%',
        outline: 'none',
        lineHeight: '2em',
        fontSize: '20px',
        border: '0',
    },
    small_fresh_btn: {
        color: 'black',
        margin: '0 auto',
    },
    link_fresh_btn: {
        border: '0',
        margin: '0 10px',
        padding: '0',
        color: 'blue',
        textDecoration: 'underline',
        fontSize: 'inherit',
    },
    fresh_status_text_bar: {
        textAlign: 'left' as const,
        color: 'gray',
        margin: '15px 5px 5px 5px',    
    }
}