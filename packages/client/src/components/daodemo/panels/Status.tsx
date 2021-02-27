import React, { useEffect, useRef, useState } from 'react';
import { Button, Container, Grid, TextField } from '@material-ui/core';
import { Modal } from '@material-ui/core';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import common_styles from '../../widget/common_style';
import project_styles from '../styles';
import Api from '../../../api/blockchain';
import {notify} from '../../widget/notify';

const styles = {...project_styles, ...{
    modal: {
        maxWidth: '700px',
        maxHeight: '200px',
        overflowY: 'scroll' as const,
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 'auto auto',
        background: 'white',
    },
    modal_body: {
        width: '100%',
        height: '100%',
        outline: 'none',
    },
    modal_input: {
        marginTop: '2em',
        marginBottom: '1em',
    },
    tab_header: {
        margin: '1em',
        fontSize: '40px',
        fontWeight: 'bolder' as const,
    },
    tab_content: {
        marginTop: '1em',
        textAlign: 'left' as const,
    },
    pane_li: {
        overflow: 'scroll' as const,
    }
}}

export type StatusProps = {
    wallet: string | undefined
}

export default function Status(props: StatusProps){
    const {wallet} = props;

    const api = new Api();
    const [daoCells, setDaoCells] = useState([]);
    const [specialDaoCells, setSpecialDaoCells] = useState([]);
    const [specialDaoParningPuppets, setSpecialDaoParningPuppets] = useState([]);

    const listMyDaoCells = async () => {
        if(wallet){
            const res = await api.listAllDaoCells(wallet);
            if(res.status == 'ok'){
                setDaoCells(res.data);
            }else{
                notify(JSON.stringify(res.data));
            }
        }else{
            notify('wallet not found.')
        }
    }

    const listMySpecialDaoCells = async () => {
        if(wallet){
            const res = await api.listSpecialDaoCells(wallet);
            if(res.status == 'ok'){
                setSpecialDaoCells(res.data.dao_cells);
                setSpecialDaoParningPuppets(res.data.puppet_cells);
            }else{
                notify(JSON.stringify(res.data));
            }
        }else{
            notify('wallet not found.')
        }
    }

    useEffect(()=>{
        if(wallet){
            listMyDaoCells();
        }
    }, [wallet]);

    return(
        <div style={styles.PanelCard}>
            <Grid container spacing={1}>
             <Container maxWidth="xl">
                 <div style={styles.tab_header}>
                    Status Board
                 </div>
                 <div style={styles.tab_content}>
                  <Tabs>
                    <TabList>
                      <Tab onClick={listMyDaoCells}>My Dao Cells</Tab>
                      <Tab onClick={listMySpecialDaoCells}>My Special Dao Cells</Tab>
                      <Tab>My Transfer</Tab>
                      <Tab>Total APR</Tab>
                      <Tab>Total Earning</Tab>
                    </TabList>

                    <TabPanel>
                      <ul>
                          {daoCells.map((c,id) => 
                          <li style={styles.pane_li}>
                           {id} : {JSON.stringify(c, null, 2)}
                          </li> )}
                      </ul>
                    </TabPanel>
                    <TabPanel>
                        <ul>
                          {specialDaoCells.map((c,id) => 
                          <li style={styles.pane_li}>
                           {id} : {JSON.stringify(c, null, 2)}
                           <br/><br/>
                           puppet_cell: {JSON.stringify(specialDaoParningPuppets[id], null, 2)}
                          </li> )}
                      </ul>
                    </TabPanel>
                    <TabPanel>
                        Not Ready
                    </TabPanel>
                    <TabPanel>
                        Not Ready
                    </TabPanel>
                    <TabPanel>
                        Not Ready
                    </TabPanel>
                  </Tabs>
                 </div>
             </Container> 
            </Grid>
        </div>
    )
}