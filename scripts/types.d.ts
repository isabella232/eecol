import { PublicClientApplication, EventType } from '@azure/msal-browser';
import * as MSAL from '@azure/msal-browser';

declare global {
  interface MSALStatic {
    PublicClientApplication: typeof PublicClientApplication;
    EventType: typeof EventType;
  }
  export interface Window {
    msal: MSALStatic;
  }
  export var msal: MSALStatic;

  export type RedirectRequest = MSAL.RedirectRequest;

  export interface APIAuthResult {
    mulesoftToken: string;
  }
}

export { };