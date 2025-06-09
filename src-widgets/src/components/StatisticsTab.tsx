import React, { Component } from 'react';

import type { VisContext } from '@iobroker/types-vis-2';

interface StatisticsTabProps {
    context: VisContext;
    instance: string;
}
interface StatisticsTabState {
    demo: string;
}

export default class StatisticsTab extends Component<StatisticsTabProps, StatisticsTabState> {
    constructor(props: StatisticsTabProps) {
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
