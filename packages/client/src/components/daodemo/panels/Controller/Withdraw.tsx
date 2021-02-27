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
        minHeight: '250px',
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


export type WithdrawProps = {
    wallet: string | undefined
    onClose: () => void
}

export default function Withdraw(props: WithdrawProps) {
    const { wallet, onClose } = props;

    const [normalDaoCapacity, setNormalDaoCapacity] = useState();
    const [specialDaoCapacity, setSpecialDaoCapacity] = useState();
    const [totalDaoCapacity, setTotalDaoCapacity] = useState();
    
    // deposit order
    const [normalDaoCells, setNormalDaoCells] = useState([]);
    const [specialDaoCells, setSpecialDaoCells] = useState([]);
    const [specialDaoPairingPuppets, setSpecialDaoPairingPuppets] = useState([]);

    const [choosedNormalCell, setChoosedNormalCell] = useState(0);
    const [choosedSpecialCell, setChoosedSpecialCell] = useState(0);

    // withdraw order
    const [normalWithdrawDaoCells, setNormalWithdrawDaoCells] = useState([]);
    const [specialWithdrawDaoCells, setSpecialWithdrawDaoCells] = useState([]);
    const [specialWithdrawDaoPairingPuppets, setSpecialWithdrawDaoPairingPuppets] = useState([]);

    const [choosedNormalWithdrawCell, setChoosedNormalWithdrawCell] = useState(0);
    const [choosedSpecialWithdrawCell, setChoosedSpecialWithdrawCell] = useState(0);


    // loading btn status
    const [isNormalDaoLoading, setIsNormalDaoLoading] = useState(false);
    const [isNormalWithdrawLoading, setIsNormalWithdrawLoading] = useState(false);
    const [isSpecialDaoLoading, setIsSpecialDaoLoading] = useState(false);
    const [isSpecialWithdrawLoading, setIsSpecialWithdrawLoading] = useState(false);
    
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

    const fetch_normal_dao_capacity = async () => {
        if(wallet){
            const res = await api.get_normal_dao_capacity(wallet);
            if(res.status === 'ok'){
                setNormalDaoCapacity(res.data);
            }else{
                notify(res.data);
            }
        }
    }

    const fetch_special_dao_capacity = async () => {
        if(wallet){
            const res = await api.get_special_dao_capacity(wallet);
            if(res.status === 'ok'){
                setSpecialDaoCapacity(res.data);
            }else{
                notify(res.data);
            }
        }
    }

    const fetch_total_dao_capacity = async () => {
        if(wallet){
            const res = await api.get_total_dao_capacity(wallet);
            if(res.status === 'ok'){
                setTotalDaoCapacity(res.data);
            }else{
                notify(res.data);
            }
        }
    }

    const withdraw_normal_dao = async () => {
        if(wallet){
            setIsMessageReceived(false);
            setIsSignModalOpen(true);

            const cell = normalDaoCells[choosedNormalCell];
            const res = await api.withdraw_normal_dao(wallet, cell);
            if(res.status === "ok"){
                setMessages(res.data.messages);
                setTx(res.data.tx);
                setIsMessageReceived(true); 
            }else{
                notify(res.data);
                setIsMessageReceived(true);
            }
        }else{
            notify('wallet not found.')
        }
    }

    const withdraw_special_dao = async () => {
        if(wallet){
            setIsMessageReceived(false);
            setIsSignModalOpen(true);
            
            const dao_cell = specialDaoCells[choosedSpecialCell];
            const puppet_cell = specialDaoPairingPuppets[choosedSpecialCell]
            const res = await api.withdraw_special_dao(wallet, dao_cell, puppet_cell);
            if(res.status === "ok"){
                setMessages(res.data.messages);
                setTx(res.data.tx);
                setIsMessageReceived(true); 
            }else{
                notify(res.data);
                setIsMessageReceived(true);
            }
        }else{
            notify('wallet not found.')
        }
    }

    const unlock_normal_dao = async () => {
        if(wallet){
            setIsMessageReceived(false);
            setIsSignModalOpen(true);
            
            const cell = normalWithdrawDaoCells[choosedNormalWithdrawCell];
            const res = await api.unlock_normal_dao(wallet, wallet, cell);
            if(res.status === "ok"){
                setMessages(res.data.messages);
                setTx(res.data.tx);
                setIsMessageReceived(true); 
            }else{
                notify(res.data);
                setIsMessageReceived(true);
            }
        }else{
            notify('wallet not found.')
        }
    }

    const unlock_special_dao = async () => {
        if(wallet){
            setIsMessageReceived(false);
            setIsSignModalOpen(true);
            
            const dao_cell = specialWithdrawDaoCells[choosedSpecialWithdrawCell];
            const puppet_cell = specialWithdrawDaoPairingPuppets[choosedSpecialWithdrawCell]
            const res = await api.unlock_special_dao(wallet, wallet, dao_cell, puppet_cell);
            if(res.status === "ok"){
                setMessages(res.data.messages);
                setTx(res.data.tx);
                setIsMessageReceived(true); 
            }else{
                notify(res.data);
                setIsMessageReceived(true);
            }
        }else{
            notify('wallet not found.')
        }
    }
    
    const handleChooseNormalCell = (event: React.ChangeEvent<HTMLInputElement>) => {
        setChoosedNormalCell(Number(event.target.value));
    };

    const handleChooseSpecialCell = (event: React.ChangeEvent<HTMLInputElement>) => {
        setChoosedSpecialCell(Number(event.target.value));
    };

    const handleChooseNormalWithdrawCell = (event: React.ChangeEvent<HTMLInputElement>) => {
        setChoosedNormalWithdrawCell(Number(event.target.value));
    };

    const handleChooseSpecialWithdrawCell = (event: React.ChangeEvent<HTMLInputElement>) => {
        setChoosedSpecialWithdrawCell(Number(event.target.value));
    }; 

    const listMyDaoCells = async (type: DaoCellType) => {
        if(!wallet)return notify('wallet not found.');
        if(type === "deposit"){setIsNormalDaoLoading(true)};
        if(type === "withdraw"){setIsNormalWithdrawLoading(true)};

        const res = await api.listAllDaoCells(wallet, type);
        if(res.status === 'ok'){
            if(type === "deposit"){
                setNormalDaoCells(res.data);
                setIsNormalDaoLoading(false);
            }else if(type === "withdraw"){
                setNormalWithdrawDaoCells(res.data);
                setIsNormalWithdrawLoading(false);
            }
        }else{
            notify(JSON.stringify(res.data));
            if(type === "deposit"){setIsNormalDaoLoading(false)};
            if(type === "withdraw"){setIsNormalWithdrawLoading(false)}; 
        }
    }

    const listMySpecialDaoCells = async (type: DaoCellType) => {
        if(!wallet)return notify('wallet not found.');
        if(type === "deposit"){setIsSpecialDaoLoading(true)};
        if(type === "withdraw"){setIsSpecialWithdrawLoading(true)};

        const res = await api.listSpecialDaoCells(wallet, type);
        if(res.status === 'ok'){
            if(type === "deposit"){
                setSpecialDaoCells(res.data.dao_cells);
                setSpecialDaoPairingPuppets(res.data.puppet_cells);
                setIsSpecialDaoLoading(false);
            }else if(type === "withdraw"){
                setSpecialWithdrawDaoCells(res.data.dao_cells);
                setSpecialWithdrawDaoPairingPuppets(res.data.puppet_cells);
                setIsSpecialWithdrawLoading(false);
            }
        }else{
            notify(JSON.stringify(res.data));
            if(type === "deposit"){setIsSpecialDaoLoading(false)};
            if(type === "withdraw"){setIsSpecialWithdrawLoading(false)};
        }
    }

    useEffect(() => {
        if(wallet){
            listMyDaoCells('deposit');
            listMySpecialDaoCells('deposit');
            listMyDaoCells('withdraw');
            listMySpecialDaoCells('withdraw'); 
        }
    }, [wallet]);

    return (
        <div style={styles.tab_root}>
            <Tabs>
              <TabList style={{textAlign: 'left'}}>
                <Tab>Withdraw</Tab>
                <Tab>Unlock</Tab>
                <Tab>Withdraw Special</Tab>
                <Tab>Unlock Special</Tab> 
              </TabList>

              <TabPanel>
                  <div style={styles.fresh_status_text_bar}>
                     select below cells to withdraw, or click: 
                     <FreshButton 
                        isLoading={isNormalDaoLoading} 
                        custom_style={styles.link_fresh_btn}
                        onClick={()=>{listMyDaoCells('deposit');}} 
                        text={'refresh'} />
                  </div>
                  <div style={styles.CellSelectPanel}>
                    {
                        normalDaoCells.map((cell: Cell, id: number) => 
                            <span>
                             <Radio
                              checked={choosedNormalCell === id}
                              onChange={handleChooseNormalCell}
                              value={id}
                             />
                             {utils.shannon2CKB(utils.hex2dec(cell.cell_output.capacity))}
                            </span>
                        )
                    }
                  </div>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                          <FreshButton text="submit" onClick={withdraw_normal_dao} custom_style={styles.button} />
                      </Grid>
                      <Grid item xs={6}>
                          <FreshButton text="cancel" onClick={cancel} custom_style={styles.button} />
                      </Grid>
                  </Grid>
              </TabPanel>
              <TabPanel>
                  <div style={styles.fresh_status_text_bar}>
                     select below cells to unlock, or click: 
                     <FreshButton 
                        isLoading={isNormalWithdrawLoading} 
                        custom_style={styles.link_fresh_btn}
                        onClick={()=>{listMyDaoCells('withdraw');}} 
                        text={'refresh'} />
                  </div>
                  <div style={styles.CellSelectPanel}>
                    {
                        normalWithdrawDaoCells.map((cell: Cell, id: number) => 
                            <span>
                             <Radio
                              checked={choosedNormalWithdrawCell === id}
                              onChange={handleChooseNormalWithdrawCell}
                              value={id}
                             />
                             {utils.shannon2CKB(utils.hex2dec(cell.cell_output.capacity))}
                            </span>
                        )
                    }
                  </div>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                          <FreshButton text="submit" onClick={unlock_normal_dao} custom_style={styles.button} />
                      </Grid>
                      <Grid item xs={6}>
                          <FreshButton text="cancel" onClick={cancel} custom_style={styles.button} />
                      </Grid>
                  </Grid>
              </TabPanel>


              <TabPanel>
                  <div style={styles.fresh_status_text_bar}>
                     select below cells to withdraw, or click: 
                     <FreshButton 
                        isLoading={isSpecialDaoLoading} 
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
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                          <FreshButton text="submit" onClick={withdraw_special_dao} custom_style={styles.button} />
                      </Grid>
                      <Grid item xs={6}>
                          <FreshButton text="cancel" onClick={cancel} custom_style={styles.button} />
                      </Grid>
                  </Grid>
              </TabPanel>
              <TabPanel>
                 <div style={styles.fresh_status_text_bar}>
                     select below cells to unlock, or click: 
                     <FreshButton 
                        isLoading={isSpecialWithdrawLoading} 
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
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                          <FreshButton text="submit" onClick={unlock_special_dao} custom_style={styles.button} />
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
    );
}