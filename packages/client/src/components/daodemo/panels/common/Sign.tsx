import { Button, Fade, Modal, TextField } from '@material-ui/core';
import React, { useEffect, useRef, useState } from 'react';
import FreshButton from '../../../widget/fresh_button';
import common_styles from '../../../widget/common_style';
import project_styles, {colors} from '../../styles';
import Api from '../../../../api/blockchain';
import { SignMsgType, SignedWitnessArgsType } from '../../../../types/signing';
import { Transaction } from '../../../../types/blockchain';
import {notify} from '../../../widget/notify';

const styles = {...project_styles, ...{
    head: {
        minHeight: '100px',
        fontSize: '30px',
        fontWeight: 'bolder' as const,
        margin: '1em',
    },
    body: {

    },
    menu_list: {
        marginTop: '1em',
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
        marginTop: '0.5em',
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
        margin: '0px 10px',
        color: 'black',
    },
    sign_entries: {
        minHeight: '200px',
        maxHeight: '300px',
        overflowY: 'scroll' as const,
        margin: '10px 0',
        color: 'black',
        border: '1px solid rgba(0, 0, 0, 0.23)',
    },
    sign_entry_box: {
        padding: '10px',
        listStyleType: 'none',
    },
    msg_text: {
        overflowX: 'scroll' as const ,
    }
}};

export type SignProps = {
    isSignModalOpen: boolean
    isMessageReceived: boolean
    messages: SignMsgType[]
    tx: Transaction | undefined
    onExit: () => void
    onCancel: () => void
}

const Sign = (props: SignProps) => {
    const { tx, isMessageReceived, isSignModalOpen, messages, onExit, onCancel } = props;
    
    const signatures_ref = useRef<Array<HTMLInputElement | null>>([]);

    useEffect(() => {
        signatures_ref.current = signatures_ref.current.slice(0, messages.length);
     }, [messages.length]);

    const api = new Api();
    
    const send_tx = async () => {
        const sWitnessArgs: Array<SignedWitnessArgsType> = [];
        signatures_ref.current.forEach( (s, i) => {
            sWitnessArgs.push({
                index: messages[i].index,
                signature: s!.value,
                type: messages[i].type,
            })
        });
        if (tx && sWitnessArgs.length > 0) {
            const res = await api.sendTxWithSignatures(sWitnessArgs, tx);
            console.log(res);
            if (res.status === 'ok') {
                notify('发送交易成功！', "success");
                onExit();
            } else {
                notify(JSON.stringify(res.data));
            }
        } else {
            notify('tx or signature is undefind.');
        }
    };

    const cancel = () => {
        onCancel();
    };

    return(
            <Modal
                open={isSignModalOpen}
                aria-labelledby={'simple-modal-title'}
                aria-describedby={'simple-modal-description'}
                style={styles.modal}
                closeAfterTransition
                disableBackdropClick={true}
            >
                <Fade in={isSignModalOpen}>
                    <div style={styles.modal_body}>
                        <div style={styles.sign_head}>
                            <FreshButton isLoading={!isMessageReceived} text="" custom_style={common_styles.hidden_btn} onClick={() => { } } />
                            <h3 style={{display: isMessageReceived ? 'block':'none'}}>对 message 进行签名</h3>
                        </div>
                        <div style={styles.sign_entries}>
                        {
                                messages.map((msg, i) => {
                                    if(msg){
                                        return(

                                    <li key={i} style={styles.sign_entry_box}>
                                    <div style={styles.msg_text}>
                                        {msg.message}
                                    </div>
                                    <TextField
                                        inputRef={el => signatures_ref.current[i] = el}
                                        id="outlined-password-input"
                                        label="signature.."
                                        variant="outlined"
                                        style={styles.modal_input}
                                        fullWidth />
                                </li>
                                        )
                                    }
                                })
                        }
                        </div>
                        <Button variant="outlined" onClick={send_tx} fullWidth>
                            confirm and transfer
                        </Button>
                        <br /> <br />
                        <Button variant="outlined" onClick={cancel} fullWidth>
                            cancel
                        </Button>
                    </div>
                </Fade>
            </Modal>
    )
}

export default Sign;