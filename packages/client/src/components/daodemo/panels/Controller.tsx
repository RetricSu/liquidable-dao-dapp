import React, { useRef, useState } from 'react';
import { Button, Container, Fade, Grid, TextField } from '@material-ui/core';
import { Modal } from '@material-ui/core';
import common_styles from '../../widget/common_style';
import project_styles, {colors} from '../styles';
import FreshButton from '../../widget/fresh_button';
import Api from '../../../api/blockchain';
import { Transaction } from '../../../types/blockchain';
import { notify } from '../../widget/notify';
import DepositPanel from './Controller/DepositPanel';
import SpecailDepositPanel from './Controller/SpecialDepositPanel';
import Withdraw from './Controller/Withdraw';
import Transfer from './Controller/Transfer';


const styles = {...project_styles, ...{
    head: {
        fontSize: '30px',
        fontWeight: 'bolder' as const,
    },
    body: {

    },
    menu_list: {
        marginTop: '30%',
        marginBottom: '1em',
    },
    menu_button: {
        width: '100%',
        padding: '10px',
        marginBottom: '10px',
        fontSize: '20px',
    },
    modal: {
        maxWidth: '700px',
        maxHeight: '500px',
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
        background: 'white',
        padding: '10px',
    },
    modal_input: {
        marginTop: '2em',
        marginBottom: '1em',
    },
    button: {
        width:'100%', 
        color: colors.dark,
        padding: '20px',
        fontSize: '20px',
    },
    deposit_head: {
        minHeight: '40px',
        margin: '5px 0px',
        textAlign: 'left' as const,
        fontSize: '20px',
        fontWeight: 'bolder' as const,
    },
    sign_head: {
        height: '200px',
        margin: '0px 10px',
        padding: '10px',
        overflow: 'scroll' as const,
        color: 'black',
    }
}}

export type ControllerProps = {
    wallet: string | undefined
}

export default function Controller(props: ControllerProps){
    const { wallet } = props;

    const [isDepositOpen, setIsDepositOpen] = useState(false);
    const [isSpecialDepositOpen, setIsSpecialDepositOpen] = useState(false);
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [isCaculatorOpen, setIsCaculatorOpen] = useState(false);

    const [isMenuOpen, setIsMenuOpen] = useState(true);

    const openDeposit = () => {
        setIsDepositOpen(true);
        setIsMenuOpen(false);
    }

    const openSpecialDeposit = () => {
        setIsSpecialDepositOpen(true);
        setIsMenuOpen(false);
    }

    const openWithdraw = () => {
        setIsWithdrawOpen(true);
        setIsMenuOpen(false);
    }

    const openTransfer = () => {
        setIsTransferOpen(true);
        setIsMenuOpen(false);
    }
    
    const handleClose = () => {
        setIsDepositOpen(false);
        setIsSpecialDepositOpen(false);
        setIsWithdrawOpen(false);
        setIsTransferOpen(false);
        setIsMenuOpen(true);
    }
    
    return(
        <div style={styles.PanelCard}>
           <Grid container spacing={1}>
            <Grid container spacing={1}>
             <Container maxWidth="md">
                <div style={styles.head}>
                    Controller
                </div>
                <div style={styles.body}>
                    <div style={{display: isMenuOpen ? 'block' : 'none' }}>
                        <div style={styles.menu_list}>
                           <button style={styles.menu_button} onClick={openDeposit}>Deposit</button>
                           <button style={styles.menu_button} onClick={openSpecialDeposit}>Deposit With Special Lock</button>
                           <button style={styles.menu_button} onClick={openWithdraw}>Withdraw</button>
                           <button style={styles.menu_button} onClick={openTransfer}>Transfer Dao Cell</button>
                        </div>
                    </div>

                    <div style={{display: isDepositOpen ? 'block' : 'none' }}>
                        <DepositPanel wallet={wallet} onClose={handleClose} />
                    </div>

                    <div style={{display: isSpecialDepositOpen ? 'block' : 'none' }}>
                        <SpecailDepositPanel wallet={wallet} onClose={handleClose} />
                    </div>

                    <div style={{display: isWithdrawOpen ? 'block' : 'none' }}>
                        <Withdraw wallet={wallet} onClose={handleClose} />
                    </div>

                    <div style={{display: isTransferOpen ? 'block' : 'none' }}>
                        <Transfer wallet={wallet} onClose={handleClose} />
                    </div>

                </div>
             </Container> 
            </Grid>
           </Grid>
        </div>
    )
}