import * as React from 'react';

export class ScreenKeyboardLayout extends React.Component<{}, {}>{
	private readonly _layoutRef: React.RefObject<HTMLDivElement>;

	constructor(props: {}) {
		super(props);

		this._layoutRef = React.createRef();
	}

	render() {
		// Перебьем zIndex tooltip layout в event view
		const layoutStyles: React.CSSProperties = !!this._layoutRef.current?.children.length
			? { position: 'absolute', zIndex: 1000000 }
			: {};

		return (
			<div
				id={ 'screen-keyboard-layout' }
				style={ layoutStyles }
				ref={ this._layoutRef }
			/>
		);
	}
}
