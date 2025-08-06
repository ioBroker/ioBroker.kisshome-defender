import React from 'react';

import type { RxRenderWidgetProps, RxWidgetInfo } from '@iobroker/types-vis-2';
import type VisRxWidget from '@iobroker/types-vis-2/visRxWidget';

import KisshomeDefenderMain from './Widget';

interface KisshomeDefenderRxData {
    instance: `${number}`;
}

export default class KisshomeDefender extends (window.visRxWidget as typeof VisRxWidget)<KisshomeDefenderRxData> {
    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplKisshomeDefender',
            visSet: 'kisshome-defender',
            visSetLabel: 'set_label', // Label of widget set
            visSetColor: '#ff9c2c', // Color of a widget set
            visWidgetLabel: 'KISSHome', // Label of widget
            visName: 'KisshomeDefender',
            visAttrs: [
                {
                    name: 'common', // group name
                    fields: [
                        {
                            label: 'instance',
                            name: 'instance',
                            type: 'instance',
                            adapter: 'kisshome-defender',
                            isShort: true,
                            default: '0',
                        },
                    ],
                },
            ],
            visDefaultStyle: {
                width: '100%',
                height: '100%',
                top: 0,
                left: 0,
            },
            visPrev: 'widgets/kisshome-defender/img/prev_kisshome-defender.png',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return KisshomeDefender.getWidgetInfo();
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element | React.JSX.Element[] | null {
        super.renderWidgetBody(props);

        return (
            <KisshomeDefenderMain
                socket={this.props.context.socket}
                instance={this.state.rxData.instance}
                editMode={this.props.editMode}
                themeType={this.props.context.themeType}
                lang={this.props.context.lang}
            />
        );
    }
}
