import { Modal, Fade, TextField, Button } from '@material-ui/core';
import React, { useRef, useState } from 'react';
import Api from '../../../../api/blockchain';
import {notify} from '../../../widget/notify';

const styles = {
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
        marginTop: '1em',
        marginBottom: '1em',
    },
    modal_text: {
        color: 'black',
        marginTop: '1em',
        padding: '5px 0',
        display: 'block',
        textAlign: 'center' as const,
    }
}

export type FaucetProps = {
    open: boolean
    handleClose: () => void
}

export default function Faucet(props: FaucetProps) {

    const { open, handleClose } = props;
    const wallet_ref = useRef<any>(null);

    const claim = async () => {
        const address = wallet_ref.current?.value;
        if(!address || address.length != 46 || address.slice(0,3) != 'ckt')
            return notify("required testnet address.");

        const api = new Api();
        const res = await api.claim_faucet(address);
        console.log(res);
        if (res.status != 'ok')
            return notify(JSON.stringify(res.data)); 

        
        notify('claimed 10000 CKB! wait a few seconds to receive.', "success");
        handleClose();
    }

    return(
        <div>
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
                        <span style={styles.modal_text}>claim 10000 test CKB </span>
                        <TextField
                          inputRef={wallet_ref}
                          id="outlined-password-input"
                          label="enter CKB testnet address.."
                          variant="outlined"
                          style={styles.modal_input}
                          fullWidth
                        />
                        <Button variant="outlined" onClick={claim} fullWidth>
                          claim
                        </Button>
                    </div>
                </Fade>
            </Modal>
        </div>
    )
}