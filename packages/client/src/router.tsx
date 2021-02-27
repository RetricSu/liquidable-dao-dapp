import React from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import DaoDemo from './components/daodemo/DaoDemo';

export default function MyRouter() {
  return (
    <BrowserRouter>
      <Switch>
        <Route path='/'>
          <DaoDemo />
        </Route>
     </Switch> 
    </BrowserRouter>
  );
}
