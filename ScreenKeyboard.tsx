import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { app } from 'App';

import BackspaceIcon from './res/backspace-icon.svg';
import EnterIcon from './res/enter-icon.svg';
import ShiftIcon from './res/shift-icon.svg';
import CapsLockIcon from './res/capslock-icon.svg';
import DeleteAllIcon from './res/delete-all-icon.svg';
import ChangeLangIcon from './res/change-lang-icon.svg';
import SwitchToSymbolsIcon from './res/switch-to-symbols-icon.svg';

import cn = require('classnames');
import css = require('Controls/ScreenKeyboard/ScreenKeyboard.module.sass');

export interface IScreenKeyboardProps {
	input?: HTMLInputElement;

	// Признак того, что мы редактируем не инпут
	notUseForInput?: boolean;

	// поле value надо, если мы редактируем не инпут, а к примуре Digits в запросах
	value?: string;

	useOnlyNumbers?: boolean;
	styles?: React.CSSProperties;

	// Макс количество символов, обрабатываемое клавиатурой
	maxHandleLength?: number;

	// Признак того что инпут - это UIMasked, для телефона.
	// Поля обязательные
	usePhoneMask?: boolean;
	mask?: string;
	maskChar?: string;

	// Признако того, что надо расчитать положение клавиатуры от верха страницы
	useComputedTopOffset?: boolean;

	// Признак того что клавиатуру отрендерится в портале (используется в event view)
	renderThroughPortal?: boolean;

	onChange?(value: string): void;
	onFormSubmit?(): void;
}
export interface IScreenKeyboardState {
	value?: string;
	isUppercase?: boolean;
	isShiftActive?: boolean;
	isCapsLockActive?: boolean;
	isLayoutRussian?: boolean;
	isShowSymbolsActive?: boolean;
	carriagePosition?: number;
}

export enum EKeyboardSymbols {
	Backspace = 'backspace',
	Clear = 'clear',
	Capslock = 'capslock',
	Enter = 'enter',
	Shift = 'shift',
	Space = 'space',
	ChangeLanguage = 'changeLanguage',
	SwitchToSymbols = 'switchToSymbols'
}

export class ScreenKeyboard extends React.Component<IScreenKeyboardProps, IScreenKeyboardState> {
	// Список символов для которых нужен класс symbol, т.е не дефолтная ширина
	private readonly _symbolsWithDiffWidth: string[];
	private readonly _symbols: string[];
	private readonly _itemIconBySymbol: { [K in EKeyboardSymbols]?: JSX.Element };
	private readonly _keyboardRef: React.RefObject<HTMLDivElement>;
	private _symbolsWithDarkBG: string[];
	private _topOffset: number;

	constructor(props: IScreenKeyboardProps) {
		super(props);

		this.state = {
			isUppercase: false,
			isShiftActive: false,
			isCapsLockActive: false,
			carriagePosition: 0,
			isLayoutRussian: false,
			isShowSymbolsActive: false,
			value: props.value ?? ''
		};

		this._symbols = [
			EKeyboardSymbols.Backspace,
			EKeyboardSymbols.Clear,
			EKeyboardSymbols.Space,
			EKeyboardSymbols.Capslock,
			EKeyboardSymbols.ChangeLanguage,
			EKeyboardSymbols.SwitchToSymbols,
			EKeyboardSymbols.Shift
		];

		this._symbolsWithDiffWidth = [
			EKeyboardSymbols.Backspace,
			EKeyboardSymbols.Capslock,
			EKeyboardSymbols.Enter,
			EKeyboardSymbols.Shift,
			EKeyboardSymbols.ChangeLanguage,
			'@',
			'',
			EKeyboardSymbols.SwitchToSymbols,
			EKeyboardSymbols.Clear
		];

		this._symbolsWithDarkBG = this.getSymbolsWithDarkBgColor();

		this._itemIconBySymbol = {
			[EKeyboardSymbols.Backspace]: <BackspaceIcon />,
			[EKeyboardSymbols.Enter]: <EnterIcon />,
			[EKeyboardSymbols.Shift]: <ShiftIcon />,
			[EKeyboardSymbols.Capslock]: <CapsLockIcon />,
			[EKeyboardSymbols.Clear]: <DeleteAllIcon />,
			[EKeyboardSymbols.ChangeLanguage]:
				<>
					<ChangeLangIcon style={{ marginRight: '10px' }} />
					{ this.state.isLayoutRussian ? 'English' : 'Русский' }
				</>,
			[EKeyboardSymbols.SwitchToSymbols]:
				<><SwitchToSymbolsIcon style={{ marginRight: '10px' }} />{ app.locale.stakemat.symbols }</>,
		};

		this._keyboardRef = React.createRef();
		this._topOffset = ScreenKeyboard.getComputedOffsetTop();
	}

	componentDidMount(): void {
		document.addEventListener('mousedown', this.onMouseDownHandle);
		window.addEventListener('load', this.computeTopOffset);
	}

	componentWillUnmount(): void {
		document.removeEventListener('mousedown', this.onMouseDownHandle);
		window.removeEventListener('load', this.computeTopOffset);
	}

	componentWillReceiveProps(nextProps: Readonly<IScreenKeyboardProps>, nextContext: any): void {
		if (this.props.value != nextProps.value) {
			this.setState({ value: nextProps.value });
		}
	}

	componentDidUpdate(prevProps: Readonly<IScreenKeyboardProps>, prevState: Readonly<IScreenKeyboardState>): void {
		const { state } = this;

		if (prevState.isLayoutRussian != state.isLayoutRussian) {
			this.updateChangeLanguageIcon()
		}

		if (prevState.isShowSymbolsActive != state.isShowSymbolsActive) {
			this.updateSwitchToSymbolsIcon(!prevState.isShowSymbolsActive);
			this._symbolsWithDarkBG = this.getSymbolsWithDarkBgColor();
			this.forceUpdate();
		}
	}

	public get screenKeyboardElement(): HTMLDivElement {
		return this._keyboardRef.current;
	}

	private computeTopOffset = (): void => {
		this._topOffset = ScreenKeyboard.getComputedOffsetTop();

		this.setState({});
	};

	// Если кликаем по клавиатуре, превентим, чтобы фокус не терялся
	protected onMouseDownHandle = (e: MouseEvent): void => {
		const el = e.target as HTMLElement;

		if (this._keyboardRef.current?.contains(el)) {
			e.stopPropagation();
			e.preventDefault();
		}
	};

	private get input(): HTMLInputElement {
		return this.props.input;
	}

	// Длина маски, чтобы не обрабатывать клики, когда значение превышает длину маски
	private get maskLength(): number {
		return this.props.mask?.length || 0;
	}

	private get mask(): string {
		return this.props.mask || '';
	}

	private get maskChar(): string {
		return this.props.maskChar || '';
	}

	private get prefixLength(): number {
		return this.props.mask?.indexOf(this.maskChar) ?? 0;
	}

	// Максимальное количество символов допустимое для ввода в инпут
	private get maxHandleCharsCount(): number {
		return this.mask.split('').filter(char => char === this.maskChar).length;
	}

	private updateChangeLanguageIcon(): void {
		this._itemIconBySymbol[EKeyboardSymbols.ChangeLanguage] =
		<>
			<ChangeLangIcon style={{ marginRight: '10px' }} />
			{ this.state.isLayoutRussian ? app.locale.stakemat.english : app.locale.stakemat.russian }
		</>;

		this.forceUpdate();
	}

	private updateSwitchToSymbolsIcon(isShowSymbolsActive: boolean): void {
		this._itemIconBySymbol[EKeyboardSymbols.SwitchToSymbols] = isShowSymbolsActive
			? <>ABC</>
			: <><SwitchToSymbolsIcon style={{ marginRight: '10px' }} />{ app.locale.stakemat.symbols }</>
	}

	private get valueWithoutMask(): string {
		return this.input.value
			.slice(this.prefixLength)
			.replace(/[\D]/g, '');
	}

	private getSymbolsWithDarkBgColor(): string[] {
		return this.state.isShowSymbolsActive
			? [
				EKeyboardSymbols.SwitchToSymbols,
				EKeyboardSymbols.Backspace,
				EKeyboardSymbols.Enter,
				EKeyboardSymbols.Clear
			]
			: [
				'`', '@', '+', '-', '[', ']', ';', "'", '\\', '_', ',', '.', '/',
				EKeyboardSymbols.Shift,
				EKeyboardSymbols.Capslock,
				EKeyboardSymbols.ChangeLanguage,
				EKeyboardSymbols.Enter,
				EKeyboardSymbols.Backspace,
				EKeyboardSymbols.Clear,
				EKeyboardSymbols.SwitchToSymbols,
			];
	}

	// Рендерит ряд клавиатуры
	private makeKeyboardRow(list: string[]): JSX.Element[] {
		return list.map(this.makeLiWithClass);
	}

	// Оборачивает переданное значение в тег li и вешает класс
	private makeLiWithClass = (value: EKeyboardSymbols, index: number): JSX.Element => {
		const { state } = this;

		const shouldApplyActiveClass = (value == EKeyboardSymbols.Capslock && state.isCapsLockActive)
			|| (value == EKeyboardSymbols.Shift && state.isShiftActive);

		return (
			<li
				className={ cn({
					[css['screen-keyboard__item']]: true,
					[css['_symbol']]: this._symbolsWithDiffWidth.includes(value),
					[css['_bg-dark']] : this._symbolsWithDarkBG.includes(value),
					[css['_active']]: shouldApplyActiveClass
				}) }
				key={ index }
				data-key={ value }
				{ ...value === EKeyboardSymbols.Space ? { style: { flex: 1 } } : {} }
			>
				{
					this._itemIconBySymbol[value]
						? this._itemIconBySymbol[value]
						: value === EKeyboardSymbols.Space ? '' : this.state.isUppercase ? value.toUpperCase() : value
				}
			</li>
		);
	}

	// Первый ряд клавиатуры
	private renderFirstRow(): JSX.Element {
		const chars = ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '+', EKeyboardSymbols.Backspace];

		return (
			<ul className={ css['screen-keyboard__row'] }>
				{ this.makeKeyboardRow(chars) }
			</ul>
		);
	}

	// Второй ряд клавиатуры
	private renderSecondRow(): JSX.Element {
		const { state } = this;

		const chars = state.isLayoutRussian
			? ['@', 'й', 'ц', 'у', 'к', 'е', 'н', 'г', 'ш', 'щ', 'з', 'х', 'ъ', EKeyboardSymbols.Enter]
			: ['@', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', EKeyboardSymbols.Enter];

		const symbols = ['@', '!', '#', '$', '%', '^', '&', '*', '(', ')', '<', '>', '=', EKeyboardSymbols.Enter];

		return (
			<ul className={ css['screen-keyboard__row'] }>
				{ this.makeKeyboardRow(state.isShowSymbolsActive ? symbols : chars) }
			</ul>
		);
	}

	// Третий ряд клавиатуры
	private renderThirdRow(): JSX.Element {
		const { state } = this;

		const chars = state.isLayoutRussian
			? [EKeyboardSymbols.Capslock, 'ф', 'ы', 'в', 'а', 'п', 'р', 'о', 'л', 'д', 'ж', "э", 'ё', '_']
			: [EKeyboardSymbols.Capslock, 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", '\\', '_'];

		const symbols = [
			'№', '/', '?', '%', ':', ',', '.', ';', '{', '}', '[', ']', '|', '\\', '_'
		];

		return (
			<ul className={ css['screen-keyboard__row'] }>
				{ this.makeKeyboardRow(state.isShowSymbolsActive ? symbols : chars) }
			</ul>
		);
	}

	// Четвертый ряд клавиатуры
	private renderFourthRow(): JSX.Element {
		const { state } = this;

		if (state.isShowSymbolsActive) return null;

		const chars = state.isLayoutRussian
			? [EKeyboardSymbols.Shift, 'я', 'ч', 'с', 'м', 'и', 'т', 'ь', 'б', 'ю', '/', EKeyboardSymbols.Shift]
			: [EKeyboardSymbols.Shift, 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', EKeyboardSymbols.Shift];

		return (
			<ul className={ css['screen-keyboard__row'] }>
				{ this.makeKeyboardRow(chars) }
			</ul>
		);
	}

	// Пятый ряд клавиатуры
	private renderFifthRow(): JSX.Element {
		const { state } = this;

		const chars = [
			EKeyboardSymbols.SwitchToSymbols,
			EKeyboardSymbols.Space,
			EKeyboardSymbols.ChangeLanguage,
			EKeyboardSymbols.Clear
		];

		const symbols = [
			EKeyboardSymbols.SwitchToSymbols,
			EKeyboardSymbols.Space,
			"'", '"', '~',
			EKeyboardSymbols.Clear
		];

		return (
			<ul className={ css['screen-keyboard__row'] }>
				{ this.makeKeyboardRow(state.isShowSymbolsActive ? symbols : chars) }
			</ul>
		);
	}

	// Рендерит ряд клавиатуры, если используем только цифры
	private renderOnlyNumbersRow(): JSX.Element {
		const symbols = [
			'7', '8', '9', '4', '5', '6', '1', '2', '3',
			EKeyboardSymbols.Clear, '0' , EKeyboardSymbols.Backspace
		];

		return (
			<ul className={ css['screen-keyboard__row'] }>
				{ this.makeKeyboardRow(symbols) }
			</ul>
		);
	}

	// Метод вызывается чтобы поставить каретку в нужное положение в контроле с маской
	public doClear(): void {
		this.doChange(this.mask);
		const position = this.mask.indexOf(this.maskChar)
		this.setState({}, () => this.input.setSelectionRange(position, position));
	}

	private doChange(value: string): void {
		this.props.onChange?.(value);
	}

	// Обрабатывает нажатие на клавиатуру
	private onKeyboardClickHandle = (e: React.MouseEvent): void => {
		const { state, props } = this;

		if (!props.input && !props.notUseForInput) return;

		e.stopPropagation();

		const $el = e.target as HTMLElement;

		let pressedSymbol = $el.dataset?.key;
		// Если нажали сразу на клавишу
		if (pressedSymbol) {

			// Если это не символ и капс активен, то вернем значение с Капсом
			pressedSymbol = !this._symbols.includes(pressedSymbol) && state.isUppercase
				? pressedSymbol.toUpperCase()
				: pressedSymbol;
		} else {
			// Проверим есть ли Li среди родителей
			const $closestLi: HTMLLIElement= $el.closest('LI');

			// И есть ли дата атрибут у него
			const liPressedSymbol = $closestLi?.dataset?.key;

			// Если есть, то считаем данные
			if (liPressedSymbol) {
				pressedSymbol = !this._symbols.includes(liPressedSymbol) && state.isUppercase
					? liPressedSymbol.toUpperCase()
					: liPressedSymbol;

				// Если нет, значит кликнули не по клавиатуре и обрабатывать нечего.
			} else return;
		}

		// Сбросим активность шифта, если он активен
		if (state.isShiftActive) {
			this.removeActiveShift();
		}

		if (pressedSymbol == EKeyboardSymbols.Enter) {
			this.onFormSubmit();
			return;
		}

		const carriagePosition = this.input?.selectionStart;

		if (props.usePhoneMask) {
			if (pressedSymbol == EKeyboardSymbols.Backspace) {
				const valueAfterDelete = this.deleteOneSymbolByCarriagePosition(carriagePosition);
				this.doChange(valueAfterDelete)
				this.setState({}, () => this.setCarriagePositionByDeleteOne(carriagePosition));
			} else if (pressedSymbol == EKeyboardSymbols.Clear) {
				this.doClear();
			} else {
				const valueAfterAdd = this.addOneSymbolByCarriagePosition(carriagePosition, pressedSymbol);
				const position = carriagePosition < this.prefixLength ? this.prefixLength : carriagePosition;
				this.doChange(valueAfterAdd);
				this.setState({}, () => this.setCarriagePositionByAdd(position))
			}
			return;
		}

		const editedValue = this.input ? this.input.value : state.value;
		const newValue = this.getValueAfterKeyboardClick(pressedSymbol, editedValue, carriagePosition);
		this.doChange(newValue);
		this.setState({}, () => this.setFocus())
	};

	// Устанавливает положение коретки при добавлении символа
	private setCarriagePositionByAdd(position: number): void {
		if (position === this.maskLength) {
			this.input.setSelectionRange(this.maskLength, this.maskLength);
			return;
		}

		const nextMaskCharSymbolIndex = this.mask.slice(position).indexOf(this.maskChar) + position + 1;
		this.input.setSelectionRange(nextMaskCharSymbolIndex, nextMaskCharSymbolIndex);
	}

	// Устанавливает положение коретки при удалении символа
	private setCarriagePositionByDeleteOne(position: number): void {
		if (position === this.prefixLength) {
			this.input.setSelectionRange(this.prefixLength, this.prefixLength);
			return;
		}


		const slicedValue = this.input.value.slice(0, position - 1);
		const nextNumber = slicedValue.match(/\d/g)?.pop();
		const nextNumberIndex = slicedValue.lastIndexOf(nextNumber) + 1;
		this.input.setSelectionRange(nextNumberIndex, nextNumberIndex);
	}

	private setFocus(): void {
		if (!!this.input && !this.props.notUseForInput) {
			this.input.scrollLeft = this.input.scrollWidth;
			this.input.setSelectionRange(this.state.carriagePosition, this.state.carriagePosition);
		}
	}

	// Обрабатывает нажатый символ, в зависимости от его значения
	private onSymbolHandle(symbol: string, value: string, carriagePosition: number): string {
		const { state } = this
		switch (symbol) {
			case EKeyboardSymbols.Capslock:
				this.setState({
					isUppercase: state.isShiftActive ? true : !state.isUppercase,
					isCapsLockActive: !state.isCapsLockActive
				});

				return value;

			case EKeyboardSymbols.Shift:
				this.setState({
					isShiftActive: !state.isShiftActive,
					isUppercase: state.isCapsLockActive ? true : !state.isUppercase,
					isCapsLockActive: state.isCapsLockActive ? false : state.isCapsLockActive
				});

				return value;

			case EKeyboardSymbols.Backspace:
				return this.deleteOneSymbol(value, carriagePosition);

			case EKeyboardSymbols.Clear:
				return '';

			case EKeyboardSymbols.Space:
				return this.addOneSymbol(' ', value, carriagePosition);

			case EKeyboardSymbols.ChangeLanguage:
				this.setState(prevState => ({ isLayoutRussian: !prevState.isLayoutRussian }));

				return value;

			case EKeyboardSymbols.SwitchToSymbols:
				this.setState(prevState => ({ isShowSymbolsActive: !prevState.isShowSymbolsActive }));

				return value;

			default: return value;
		}
	}

	// Возвращает новое значение после кликв по экранной клавиатуре
	private getValueAfterKeyboardClick = (symbol: string, value: string, carriagePosition: number = 0): string => {
		const shouldHandleSymbol = this._symbols.includes(symbol);

		return shouldHandleSymbol
			? this.onSymbolHandle(symbol, value, carriagePosition)
			: this.addOneSymbol(symbol, value, carriagePosition);
	};

	// Метод обработки удаления одного символа, в зависимости от положения каретки
	private deleteOneSymbol(value: string, carriagePosition: number): string {
		if (this.props.notUseForInput) {
			return value ? value.slice(0, value.length - 1) : value;
		}

		this.setState({ carriagePosition: carriagePosition == 0 ? 0 : carriagePosition - 1 })

		return value
			.split('')
			.filter((item, index) => index != carriagePosition - 1, 1)
			.join('');
	}

	// Метод обработки добавления одного символа, в зависимости от положения каретки
	private addOneSymbol(symbol: string, value: string, carriagePosition: number): string {
		const { props } = this;

		if (!!props.maxHandleLength && props.maxHandleLength == value.length) return value;

		if (props.notUseForInput) {
			return value + symbol;
		}

		this.setState({ carriagePosition: carriagePosition + 1 });

		const charsArr = value.split('');
		charsArr.splice(carriagePosition, 0, symbol);

		return charsArr.join('');
	}

	// Добавляем один символ в зависимости от положения каретки для инпута телефона с маской
	private addOneSymbolByCarriagePosition(position: number, value: string): string {
		const newValue = this.input.value.split('')
		newValue.splice(position, 1, value);

		if (position < this.input.value.length) {
			// Обрежем значения, если они вышли за пределы допустимой длины
			newValue.length = this.valueWithoutMask.length > this.maxHandleCharsCount
				? this.maskLength
				: this.input.value.length

			return newValue.join('');
		} else {
			return this.valueWithoutMask.length == this.maxHandleCharsCount
				? this.input.value
				: newValue.join('');
		}
	}


	// Удаляем один символ в зависимости от положения каретки для инпута телефона с маской
	private deleteOneSymbolByCarriagePosition(position: number): string {
		// Если нечего удалять, выйдем
		if (!this.valueWithoutMask.length) return '';

		const removingIndex = position - 1;

		return this.input.value
			.split('')
			.filter((item, index) => index != removingIndex, 1)
			.join('');
	}

	// Убирает признак активности у шифта
	private removeActiveShift(): void {
		const { state } = this;

		this.setState({
			isShiftActive: false,
			isUppercase: state.isCapsLockActive
		});
	}

	// Рендерит раскладку клавиатуры: только числа или полностью
	private renderKeyboardContent(): JSX.Element {
		const { props } = this;

		if (props.useOnlyNumbers) {
			return this.renderOnlyNumbersRow();
		}

		return (
			<>
				{ this.renderFirstRow() }
				{ this.renderSecondRow() }
				{ this.renderThirdRow() }
				{ this.renderFourthRow() }
				{ this.renderFifthRow() }
			</>
		);
	}

	private onFormSubmit(): void {
		this.props.onFormSubmit?.();
	}

	private static getComputedOffsetTop(): number {
		const smallDisplayMarginTop = 60;
		const largeDisplayMarginTop = 220;
		const largeDisplayWidth = 1920;
		const $form = document.querySelector('form');
		const formHeight = $form?.clientHeight ?? 0;
		const marginBottom = 32;
		const marginTop = window.innerWidth >= largeDisplayWidth ? largeDisplayMarginTop : smallDisplayMarginTop;

		return formHeight + marginBottom + marginTop;
	}

	// Рендерит полный компонент: Инпут, Клавиатура, Кнопка
	private renderContent(): JSX.Element {
		const { props } = this;

		if (!props.input && !props.notUseForInput) return null;

		// Если все условия true - значит мы на сайте
		const shouldShowUnderlying = app.loggedIn() && (app.profileInfo?.clientInfo.phoneNumberConfirmed ?? false);

		return (
			<div
				className={ css['screen-keyboard-wrap'] }
				style={ props.useComputedTopOffset ? { ...props.styles, top: this._topOffset } : props.styles }
			>
				<div
					className={ cn({
						[css['screen-keyboard']]: true,
						[css['_numbers']]: props.useOnlyNumbers,
					}) }
					ref={ this._keyboardRef }
					onClick={ this.onKeyboardClickHandle }
				>
					{ shouldShowUnderlying && <div className={ css['screen-keyboard__underlying'] } /> }
					{ this.renderKeyboardContent() }
				</div>
			</div>
		);
	}

	private insertKeyboardIntoPortal(): React.ReactPortal {
		const parentNode = document.getElementById('screen-keyboard-layout') as HTMLDivElement;

		if (!parentNode) return null;

		return ReactDOM.createPortal(this.renderContent(), parentNode);
	}

	render():JSX.Element {
		return this.props.renderThroughPortal ? this.insertKeyboardIntoPortal() : this.renderContent();
	}
}
