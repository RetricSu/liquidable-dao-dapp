import { Button, Fade, FormControl, FormControlLabel, FormLabel, Grid, InputLabel, MenuItem, Modal, Radio, RadioGroup, Select, TextField } from "@material-ui/core";
import React, { useEffect, useRef, useState } from "react";
import Api from "../../../../api/blockchain";
import { Cell, DaoCellType, Transaction } from "../../../../types/blockchain";
import FreshButton from "../../../widget/fresh_button";
import {notify} from "../../../widget/notify";
import project_styles, {colors} from '../../styles';
import common_styles from '../../../widget/common_style';
import { Tab, TabList, TabPanel, Tabs } from "react-tabs";
import 'react-tabs/style/react-tabs.css';
import utils from '../../../../utils/index';
import Sign from '../common/Sign';
import { SignedWitnessArgsType, SignMsgType } from "../../../../types/signing";

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
    select_mode: {
        textAlign: 'left' as const,
        marginBottom: '2em',
    },
    select_title: {
        fontSize: '20px',
        fontWeight: 'bolder' as const,
        color: 'black',
    },
    CellSelectPanel: {
        minHeight: '150px',
        border: '1px solid gray',
        margin: '1em 0',
        overflow: 'scroll' as const,
        textAlign: 'left' as const,
    },
    tab_root: {
        marginTop: '2em',
        marginBottom: '1em',

    }
}}


export type TransferProps = {
    wallet: string | undefined
    onClose: () => void
}

const Transfer = (props: TransferProps) => {
    const { wallet, onClose } = props;

    const to_address_deposit_ref = useRef<HTMLInputElement>(null);
    const to_address_withdraw_ref = useRef<HTMLInputElement>(null);

    const [specialDaoCells, setSpecialDaoCells] = useState([]);
    const [specialDaoPairingPuppets, setSpecialDaoPairingPuppets] = useState([]);
    const [choosedSpecialCell, setChoosedSpecialCell] = useState(0);

    const [specialWithdrawDaoCells, setSpecialWithdrawDaoCells] = useState([]);
    const [specialWithdrawDaoPairingPuppets, setSpecialWithdrawDaoPairingPuppets] = useState([]);
    const [choosedSpecialWithdrawCell, setChoosedSpecialWithdrawCell] = useState(0);

    const [isDepositLoading, setIsDepositLoading] = useState(false);
    const [isWithdrawLoading, setIsWithdrawLoading] = useState(false);

    const [isSignModalOpen, setIsSignModalOpen] = useState(false);
    const [isMessageReceived, setIsMessageReceived] = useState(false);

    const [messages, setMessages] = useState<Array<SignMsgType>>([]);
    const [tx, setTx] = useState<Transaction>();

    const api = new Api();

    const onSignExit = () => {
        setMessages([])
        setIsSignModalOpen(false);
        onClose();
    }

    const onSignCancel = () => {
        setMessages([]);
        setIsSignModalOpen(false); 
    }

    const cancel = () => {
        onClose();
    };

    const handleChooseSpecialCell = (event: React.ChangeEvent<HTMLInputElement>) => {
        setChoosedSpecialCell(Number(event.target.value));
    };

    const handleChooseSpecialWithdrawCell = (event: React.ChangeEvent<HTMLInputElement>) => {
        setChoosedSpecialWithdrawCell(Number(event.target.value));
    }; 

    const listMySpecialDaoCells = async (type: DaoCellType) => {
        if(!wallet)return notify('wallet not found.');
        if(type === "deposit")setIsDepositLoading(true);
        if(type === "withdraw")setIsWithdrawLoading(true);

        const res = await api.listSpecialDaoCells(wallet, type);
            if(res.status === 'ok'){
                if(type === "deposit"){
                    setSpecialDaoCells(res.data.dao_cells);
                    setSpecialDaoPairingPuppets(res.data.puppet_cells);
                    setIsDepositLoading(false);
                }else if(type === "withdraw"){
                    setSpecialWithdrawDaoCells(res.data.dao_cells);
                    setSpecialWithdrawDaoPairingPuppets(res.data.puppet_cells);
                    setIsWithdrawLoading(false);
                }
            }else{
                notify(JSON.stringify(res.data));
                if(type === "deposit")setIsDepositLoading(false);
                if(type === "withdraw")setIsWithdrawLoading(false);
            }
    }

    const transfer_deposit_dao = async () => {
        const to_address = to_address_deposit_ref.current?.value;
        if(!wallet || !to_address)return notify('wallet or to_address not found.');

        setIsMessageReceived(false);
        setIsSignModalOpen(true);
        const puppet_cell = specialDaoPairingPuppets[choosedSpecialCell]
        const res = await api.transfer_dao(wallet, to_address, puppet_cell);
        if(res.status === "ok"){
            setMessages(res.data.messages);
            setTx(res.data.tx);
            setIsMessageReceived(true); 
        }else{
            notify(res.data);
            setIsMessageReceived(true);
        }
    }

    const transfer_withdraw_dao = async () => {
        const to_address = to_address_withdraw_ref.current?.value;
        if(!wallet || !to_address)return notify('wallet or to_address not found.');

        setIsMessageReceived(false);
        setIsSignModalOpen(true);
        const puppet_cell = specialWithdrawDaoPairingPuppets[choosedSpecialWithdrawCell]
        const res = await api.transfer_dao(wallet, to_address, puppet_cell);
        if(res.status === "ok"){
            setMessages(res.data.messages);
            setTx(res.data.tx);
            setIsMessageReceived(true); 
        }else{
            notify(res.data);
            setIsMessageReceived(true);
        }
    }

    useEffect(() => {
        if(wallet){
            listMySpecialDaoCells('deposit');
            listMySpecialDaoCells('withdraw'); 
        }
    }, [wallet]);

    return(
        <div style={styles.tab_root}>
            <Tabs>
              <TabList style={{textAlign: 'left'}}>
                <Tab>Transfer  Withdraw</Tab>
                <Tab>Transfer  Unlock</Tab> 
              </TabList>

              <TabPanel>
                 <div style={styles.fresh_status_text_bar}>
                     select below cells to transfer ownership, or click: 
                     <FreshButton 
                        isLoading={isDepositLoading} 
                        custom_style={styles.link_fresh_btn}
                        onClick={()=>{listMySpecialDaoCells('deposit');}} 
                        text={'refresh'} />
                  </div>
                  <div style={styles.CellSelectPanel}>
                    {
                        specialDaoCells.map((cell: Cell, id: number) => 
                           <span>
                            <Radio
                             checked={choosedSpecialCell === id}
                             onChange={handleChooseSpecialCell}
                             value={id}
                            />
                            {utils.shannon2CKB(utils.hex2dec(cell.cell_output.capacity))}
                           </span>
                        )
                    }
                  </div>
                    <TextField
                         inputRef={to_address_deposit_ref}
                         id="outlined-password-input"
                         label="to address.."
                         variant="outlined"
                         style={styles.modal_input}
                         fullWidth
                    />
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                          <FreshButton text="submit" onClick={transfer_deposit_dao} custom_style={styles.button} />
                      </Grid>
                      <Grid item xs={6}>
                          <FreshButton text="cancel" onClick={cancel} custom_style={styles.button} />
                      </Grid>
                  </Grid>
              </TabPanel>
              <TabPanel>
                  <div style={styles.fresh_status_text_bar}>
                     select below cells to transfer ownership, or click: 
                     <FreshButton 
                        isLoading={isWithdrawLoading} 
                        custom_style={styles.link_fresh_btn}
                        onClick={()=>{listMySpecialDaoCells('withdraw');}} 
                        text={'refresh'} />
                  </div>
                  <div style={styles.CellSelectPanel}>
                    {
                        specialWithdrawDaoCells.map((cell: Cell, id: number) => 
                            <span>
                             <Radio
                              checked={choosedSpecialWithdrawCell === id}
                              onChange={handleChooseSpecialWithdrawCell}
                              value={id}
                             />
                             {utils.shannon2CKB(utils.hex2dec(cell.cell_output.capacity))}
                            </span>
                        )
                    }
                  </div>
                    <TextField
                         inputRef={to_address_withdraw_ref}
                         id="outlined-password-input"
                         label="to address.."
                         variant="outlined"
                         style={styles.modal_input}
                         fullWidth
                    />
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                          <FreshButton text="submit" onClick={transfer_withdraw_dao} custom_style={styles.button} />
                      </Grid>
                      <Grid item xs={6}>
                          <FreshButton text="cancel" onClick={cancel} custom_style={styles.button} />
                      </Grid>
                  </Grid>
              </TabPanel>
            </Tabs>

            <Sign 
                tx={tx} 
                messages={messages} 
                isSignModalOpen={isSignModalOpen} 
                isMessageReceived={isMessageReceived} 
                onExit={onSignExit} 
                onCancel={onSignCancel} 
            />
        </div>
    )
}

export default Transfer;