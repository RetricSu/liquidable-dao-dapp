import React, { useRef, useState } from 'react';
import { Button, Container, Fade, Grid, TextField } from '@material-ui/core';
import { Modal } from '@material-ui/core';
import common_styles from '../../../widget/common_style';
import project_styles, {colors} from '../../styles';
import FreshButton from '../../../widget/fresh_button';
import Api from '../../../../api/blockchain';
import { Transaction } from '../../../../types/blockchain';
import { notify } from '../../../widget/notify';
import utils from '../../../../utils/index';

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
    },
    sub_panel: {
        marginTop: '30%',
        width: '100%',
    }
}}

export type DepositPanelProps = {
    wallet: string | undefined
    onClose: () => void
}

const DepositPanel = (props: DepositPanelProps) => {
    const { wallet, onClose } = props;
    
    const amount_ref = useRef<HTMLInputElement>(null);
    const signature_ref = useRef<HTMLInputElement>(null);

    const [isSignModalOpen, setIsSignModalOpen] = useState(false);
    const [isMessageReceived, setIsMessageReceived] = useState(false);

    const [message, setMessage] = useState('');
    const [deposit_tx, setDepositTx] = useState<Transaction>();

    const api = new Api();

    const deposit = async () => {
        const amount = utils.CKB2shannon(amount_ref.current?.value!);

        if(wallet && BigInt(amount) > 0){
            setIsMessageReceived(false);
            setIsSignModalOpen(true);

            const res = await api.deposit(wallet, BigInt(amount));
            console.log(res);
            if(res.status == 'ok'){
                setMessage(JSON.stringify(res.data.messages, null, 2));
                setDepositTx(res.data.tx);
                setIsMessageReceived(true);
            }else{
                notify(JSON.stringify(res));
                setIsMessageReceived(true);
            }
        }else{
            notify('wallet or amount invalid.');
        }
    }

    const send_tx = async () => {
        const signature = signature_ref.current?.value;
        if(deposit_tx && signature){
            const res = await api.sendTxWithSignature(signature, deposit_tx);
            console.log(res);
            if(res.status == 'ok'){
                notify('交易成功！', "success");
                // clean the local variable
                setDepositTx(undefined);
                setMessage('');
                setIsSignModalOpen(false);
                onClose();
            }else{
                notify(JSON.stringify(res.data));
            }
        }else{
            notify('deposit_tx or signature is undefind.');
        }
    }

    const cancel = () => {
        onClose();
    }

    return(
        <div style={styles.sub_panel}>
            <div style={styles.deposit_head}>
               How much to deposit in NervosDAO? 
            </div>
           <span style={styles.input_wrap}>
             <input style={styles.input} ref={amount_ref} placeholder={'0'} type="number"/>
           </span>
           <Grid container spacing={2}>
               <Grid item xs={6}>
                    <FreshButton text="submit" onClick={deposit} custom_style={styles.button}/>
               </Grid>
               <Grid item xs={6}>
                    <FreshButton text="cancel" onClick={cancel} custom_style={styles.button}/>
               </Grid>
           </Grid>


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
                           <FreshButton isLoading={!isMessageReceived}  text="" custom_style={common_styles.hidden_btn} onClick={()=>{}} />
                           {message}
                       </div>
                       <TextField
                         inputRef={signature_ref}
                         id="outlined-password-input"
                         label="signature.."
                         variant="outlined"
                         style={styles.modal_input}
                         fullWidth
                       />
                       <Button variant="outlined"  onClick={send_tx} fullWidth>
                         confirm and transfer
                       </Button>
                       <br/> <br/>
                       <Button variant="outlined" onClick={()=>{setIsSignModalOpen(false)}} fullWidth>
                         cancel
                       </Button>
                   </div>
               </Fade>
           </Modal>
           
       </div>
    );
}

export default DepositPanel;