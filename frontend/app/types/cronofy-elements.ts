// Shared type definitions for Cronofy Elements
declare global {
  interface Window {
    CronofyElements?: {
      CalendarSync: (opts: {
        target_id: string;
        authorization?: {
          client_id: string;
          redirect_uri: string;
          scope: string;
          avoid_linking?: boolean;
        };
        element_token?: string;
        single_profile?: boolean;
        styles?: {
          colors?: {
            primary?: string;
            hairline?: string;
          };
        };
        config?: {
          logs?: string;
        };
      }) => {
        destroy?: () => void;
      };
    };
    __cronofyElementsLoaded?: boolean;
  }
}

export {};
