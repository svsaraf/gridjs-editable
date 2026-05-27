import { h, ComponentChild, JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

import Cell from '../../cell';
import { classJoin, className } from '../../util/className';
import { CSSDeclaration, TColumn } from '../../types';
import Row from '../../row';
import { JSXInternal } from 'preact/src/jsx';
import { PluginRenderer } from '../../plugin';
import { useConfig } from '../../hooks/useConfig';

export function TD(
  props: {
    cell: Cell;
    row?: Row;
    column?: TColumn;
    style?: CSSDeclaration;
    messageCell?: boolean;
  } & Omit<JSX.HTMLAttributes<HTMLTableCellElement>, 'style'>,
) {
  const config = useConfig();
  const inputRef = useRef<HTMLInputElement>(null);
  const skipBlurSaveRef = useRef(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [renderValue, setRenderValue] = useState(props.cell.data);

  useEffect(() => {
    setRenderValue(props.cell.data);
  }, [props.cell.data]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const content = (): ComponentChild => {
    if (editing) {
      return (
        <input
          ref={inputRef}
          className={className('td-editor-input')}
          value={editValue}
          onClick={(e) => e.stopPropagation()}
          onBlur={handleEditorBlur}
          onInput={(e) => setEditValue(e.currentTarget.value)}
          onKeyDown={handleEditorKeyDown}
        />
      );
    }

    if (props.column && typeof props.column.formatter === 'function') {
      return props.column.formatter(renderValue, props.row, props.column);
    }

    if (props.column && props.column.plugin) {
      return (
        <PluginRenderer
          pluginId={props.column.id}
          props={{
            column: props.column,
            cell: props.cell,
            row: props.row,
          }}
        />
      );
    }

    return renderValue;
  };

  const isEditable = (): boolean => {
    return (
      config.editable &&
      !props.messageCell &&
      !(props.column && props.column.plugin)
    );
  };

  const stringifyCellValue = (value: typeof props.cell.data): string => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return '';
  };

  const castEditedValue = (value: string): typeof props.cell.data => {
    if (typeof props.cell.data === 'number') {
      const numberValue = Number(value);
      return Number.isNaN(numberValue) ? value : numberValue;
    }

    if (typeof props.cell.data === 'boolean') {
      return value.toLowerCase() === 'true';
    }

    return value;
  };

  const startEditing = (
    e: JSX.TargetedMouseEvent<HTMLTableCellElement>,
  ): void => {
    if (!isEditable()) return;

    e.stopPropagation();
    setEditValue(stringifyCellValue(props.cell.data));
    setEditing(true);
  };

  const saveEdit = (): void => {
    const nextValue = castEditedValue(editValue);

    props.cell.update(nextValue);
    setRenderValue(nextValue);
    setEditing(false);
  };

  const handleEditorBlur = (): void => {
    if (skipBlurSaveRef.current) {
      skipBlurSaveRef.current = false;
      return;
    }

    saveEdit();
  };

  const handleEditorKeyDown = (
    e: JSX.TargetedKeyboardEvent<HTMLInputElement>,
  ): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      skipBlurSaveRef.current = true;
      setEditing(false);
    }
  };

  const handleClick = (
    e: JSX.TargetedMouseEvent<HTMLTableCellElement>,
  ): void => {
    if (props.messageCell) return;

    config.eventEmitter.emit(
      'cellClick',
      e,
      props.cell,
      props.column,
      props.row,
    );
  };

  const getCustomAttributes = (
    column: TColumn | null,
  ): JSXInternal.HTMLAttributes<HTMLTableCellElement> => {
    if (!column) return {};

    if (typeof column.attributes === 'function') {
      return column.attributes(props.cell.data, props.row, props.column);
    } else {
      return column.attributes;
    }
  };

  return (
    <td
      role={props.role}
      colSpan={props.colSpan}
      data-column-id={props.column && props.column.id}
      className={classJoin(
        className('td'),
        editing ? className('td', 'editing') : undefined,
        props.className,
        config.className.td,
      )}
      style={{
        ...props.style,
        ...config.style.td,
      }}
      onClick={handleClick}
      onDblClick={startEditing}
      {...getCustomAttributes(props.column)}
    >
      {content()}
    </td>
  );
}
