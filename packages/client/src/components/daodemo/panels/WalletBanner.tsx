import React, { useEffect, useRef, useState } from 'react';
import { Button, Fade, Grid, TextField } from '@material-ui/core';
import { Modal } from '@material-ui/core';
import common_styles from '../../widget/common_style';
import project_styles, { colors } from '../styles';
import logo from '../../../resource/nervos-logo.png';
import NewLogo from '../../../resource/nervos-logo-black.svg';
import Faucet from './common/Faucet';
import {notify} from '../../widget/notify';

const styles = {
    banner_root: {
        width: '100%',
        background: colors.medium,
        minHeight: '40px',
    },
    banner: {
        maxWidth: '1440px',
        color: 'gray',
        background: colors.medium,
        minHeight: '40px',
        padding: '0 120px',
        margin: '0 auto',
    },
    logo: {
        float: 'left' as const,
        padding: '20px',
        width: '60px',
        height: '60px',
    },
    wallet_box: {
        float: 'right' as const,
        padding: '20px',
    },
    wallet: {
        border: '1px solid'+ common_styles.main_color.color,
        borderRadius: '20px',
        padding: '20px',
        color: common_styles.main_color.color,
        cursor: 'pointer' as const, 
    },
    modal: {
        maxWidth: '700px',
        maxHeight: '200px',
        overflowY: 'scroll' as const,
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 'auto auto',
    },
    modal_body: {
        width: '90%',
        height: '90%',
        outline: 'none',
        padding: '10px',
        background: 'white',
    },
    modal_input: {
        marginTop: '2em',
        marginBottom: '1em',
    },
    hint: {
        width: '100%',
        height: '20px',
        textAlign: 'center' as const,
        background: 'gray',
    },
    hint_highlight: {
        color: 'blue',
        textDecoration: 'underline' as const,
        cursor: 'pointer' as const,
    }
}

export type WalletBannerProp = {
    onUpdateWallet: (wallet?: string) => void
}

export default function WalletBanner(props: WalletBannerProp){
    const { onUpdateWallet } = props;
    const [myWallet, setMyWallet] = useState();
    const wallet_ref = useRef<any>(null);

    const [isHover, setIsHover] = useState(false);
    const hover_style = {background: common_styles.main_color.color, color: 'white'};
    const toogleHover = () => {
        setIsHover(!isHover);
    }

    const [open, setOpen] = useState(false);
    const handleClose = () => {
        setOpen(false);
    }

    const [isFaucetOpen, setIsFaucetOpen] = useState(false);
    const handleFaucetClose = () => {
        setIsFaucetOpen(false);
    }
    const handleFaucetOpen = () => {
        setIsFaucetOpen(true);
    }

    const connect_wallet = () => {
        if(!myWallet){
            setOpen(true);
        }
    }

    const save_wallet = () => {
        const address = wallet_ref.current?.value;
        if(!address || address.length != 46 || address.slice(0,3) != 'ckt')
            return notify("required testnet address.");
            
        setMyWallet(address);
        handleClose();
    }

    useEffect(()=>{
        onUpdateWallet(myWallet);
    }, [myWallet]);

    return(
        <div style={styles.banner_root}>
            <Grid container style={styles.hint}>
                <Grid item xs={12}>
                    <span onClick={handleFaucetOpen} style={styles.hint_highlight}>claim</span> some test coin before try using this demo!
                    <Faucet open={isFaucetOpen} handleClose={handleFaucetClose} />
                </Grid>
            </Grid>
            <Grid container spacing={1} style={styles.banner}>
                    <Grid item xs={6}>
                        <div style={styles.logo}>
                            <img style={{width:'100%', height:'100%'}} src={NewLogo}/>
                        </div>
                    </Grid>
                    <Grid item xs={6}>
                        <div style={styles.wallet_box}>
                            <div onClick={connect_wallet} 
                                 onMouseEnter={toogleHover} onMouseLeave={toogleHover} 
                                 style={isHover ? {...styles.wallet, ...hover_style} : styles.wallet}>
                                { myWallet ? myWallet : 'Connect Wallet' }
                            </div>

                            <Modal
                                  open={open}
                                  aria-labelledby={'simple-modal-title'}
                                  aria-describedby={'simple-modal-description'}
                                  style={styles.modal}
                                  closeAfterTransition
                                  disableBackdropClick={true}
                                >
                                <Fade in={open}>
                                    <div style={styles.modal_body}>
                                        <TextField
                                          inputRef={wallet_ref}
                                          id="outlined-password-input"
                                          label="enter CKB testnet address.."
                                          variant="outlined"
                                          style={styles.modal_input}
                                          fullWidth
                                        />
                                        <Button variant="outlined" onClick={save_wallet} fullWidth>
                                            connect                                          
                                        </Button>
                                    </div>
                                </Fade>
                            </Modal>
                        </div>
                    </Grid>
            </Grid>
        </div>
    )
}