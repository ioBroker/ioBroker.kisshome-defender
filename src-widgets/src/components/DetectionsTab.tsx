import React, { Component } from 'react';

import type { VisContext } from '@iobroker/types-vis-2';

interface DetectionsTabProps {
    context: VisContext;
    instance: string;
}
interface DetectionsTabState {
    demo: string;
}

export default class DetectionsTab extends Component<DetectionsTabProps, DetectionsTabState> {
    constructor(props: DetectionsTabProps) {
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
