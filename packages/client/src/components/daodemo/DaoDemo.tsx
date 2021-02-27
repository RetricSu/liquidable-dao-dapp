import React, { useState } from 'react';
import { Container, Grid } from '@material-ui/core';
import styles from '../widget/common_style';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import WalletBanner from './panels/WalletBanner';
import DaoBall from './panels/DaoBall';
import Controller from './panels/Controller';
import Status from './panels/Status';
import Notify from '../widget/notify'

export default function DaoDemo(){
    const [wallet, setWallet] = useState<string>();

    const updateWallet = (new_wallet?: string) => {
      if(new_wallet){
        setWallet(new_wallet);
      }
    }
    
    return(
        <Grid container spacing={1}>
            <Notify />
            <Grid item xs={12}>
              <WalletBanner onUpdateWallet={updateWallet} />
              <Container maxWidth="md" style={styles.page}>
                <DndProvider backend={HTML5Backend}>
                    <Grid container spacing={2} style={{margin:'2em 0'}}>
                      <Grid item xs={6}>
                        <DaoBall />
                      </Grid>
                      <Grid item xs={6}>
                        <Controller wallet={wallet}/>
                      </Grid>
                    </Grid>
                    <Grid container spacing={1} style={{margin:'2em 0'}}>
                      <Grid item xs={12}>
                        <Status wallet={wallet}/>
                      </Grid>
                    </Grid>
                </DndProvider>
              </Container>
            </Grid>
        </Grid>
    )
}