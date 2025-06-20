import React, { Component } from 'react';

import type { VisContext } from '@iobroker/types-vis-2';
import type { ReportUxHandler } from '../types';

interface StatusTabProps {
    context: VisContext;
    instance: string;
    reportUxEvent: ReportUxHandler;
}
interface StatusTabState {
    demo: string;
}

export default class StatusTab extends Component<StatusTabProps, StatusTabState> {
    constructor(props: StatusTabProps) {
        super(props);
        this.state = {
            demo: 'demo',
        };
    }

    render(): React.JSX.Element {
        return (
            <div className="status-tab">
                <h2>Status</h2>
                <p>All systems operational.</p>
            </div>
        );
    }
}
