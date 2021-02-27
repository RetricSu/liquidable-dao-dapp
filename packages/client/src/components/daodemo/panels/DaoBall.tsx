import React, { useEffect, useRef, useState } from 'react';
import { Button, Container, Grid, TextField } from '@material-ui/core';
import { Modal } from '@material-ui/core';
import common_styles from '../../widget/common_style';
import project_styles, { colors } from '../styles';
import Water from './DaoBall/water';
import Api from '../../../api/blockchain';
import { notify } from '../../widget/notify';

const styles = {...project_styles, ...{
    dao_ball: {
        color: colors.dark,
        minHeight: '500px',
        border: '1px solid gray',
        borderRadius: '20px',
        boxShadow: `3px 3px 5px gray, -3px -3px 5px ${colors.medium}`,
        padding: '1em', 
    },
    head: {
        minHeight: '100px',
        fontSize: '30px',
        fontWeight: 'bolder' as const,
        margin: '1em',
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
    }
}}

export default function DaoBall(){
    const title = "NervosDAO";
    const sub_title = "Liquidable";

    const [daoPoolInfo, setDaoPoolInfo] = useState();

    const fetch_dao_pool = async () => {
        const api = new Api();
        const res = await api.get_dao_pool_info();
        if(res.status === "ok"){
            setDaoPoolInfo(res.data);
        }else{
            notify(res.data);
        }
    }

    useEffect( () => {       
       fetch_dao_pool(); 
    }, []);
    
    return(
        <div style={styles.dao_ball}>
            <Water title={title} sub_title={sub_title} data={daoPoolInfo} />
        </div>
    )
}