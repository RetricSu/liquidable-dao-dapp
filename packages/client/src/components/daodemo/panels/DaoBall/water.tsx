import React from 'react';
import './water.css';
import utils from '../../../../utils/index';

export type WaterProps = {
    title?: string
    sub_title?: string
    data: any
}

export default function Water(props: WaterProps){
    const { title, sub_title, data} = props;

    return(
        <div className="water">
          <div className="ripple-one"></div>
          <div className="ripple-two"></div>   
          <div className="ripple-three"></div>
          <div className="ripple-four"></div>
          <div className="text">
            <div>
                <p>{title}</p>
                <p><small>{sub_title}</small></p>
            </div>
          </div>
          <div className="data">
            { data &&
              <div>
                <li>Cells: <span className="data-number">{data.total_cells}</span></li>
                <li>Capacity: <span className="data-number">{ utils.shannon2CKB(utils.hex2dec(data.total_capacity)) }</span> CKB</li>
                <li>Estimate Address: <span className="data-number">{ data.total_address }</span></li>
              </div>
            }
         </div>
        </div>
    )
}