/* eslint-disable @typescript-eslint/ban-types */
import { comboboxActions } from '@udecode/plate-combobox'
import {
  type PlateEditor,
  type TNode,
  type TText,
  type Value,
  type WithPlatePlugin,
  getEditorString,
  getNodeString,
  getPlugin,
  getPointBefore,
  getRange,
  moveSelection,
  setSelection
} from '@udecode/plate-common'
import { Range } from 'slate'

import type { TAGPlugin, TMentionInputElement } from './types'

import { ELEMENT_TAG_INPUT } from './createTagPlugin'
import { findMentionInput, isNodeMentionInput, isSelectionInMentionInput } from './queries/index'
import { removeMentionInput } from './transforms/removeMentionInput'

export const withMention = <V extends Value = Value, E extends PlateEditor<V> = PlateEditor<V>>(
  editor: E,
  { options: { id, inputCreation, query, trigger, triggerPreviousCharPattern } }: WithPlatePlugin<TAGPlugin, V, E>
) => {
  const { type } = getPlugin<{}, V>(editor, ELEMENT_TAG_INPUT)

  const { apply, deleteBackward, insertBreak, insertFragment, insertNode, insertText, insertTextData } = editor

  const stripNewLineAndTrim: (text: string) => string = text => {
    return text
      .split(/\r\n|\r|\n/)
      .map(line => line.trim())
      .join('')
  }

  editor.insertFragment = fragment => {
    const inMentionInput = findMentionInput(editor) !== undefined

    if (!inMentionInput) {
      return insertFragment(fragment)
    }

    return insertText(fragment.map(node => stripNewLineAndTrim(getNodeString(node))).join(''))
  }

  editor.insertTextData = data => {
    const inMentionInput = findMentionInput(editor) !== undefined

    if (!inMentionInput) {
      return insertTextData(data)
    }

    const text = data.getData('text/plain')

    if (!text) {
      return false
    }

    editor.insertText(stripNewLineAndTrim(text))

    return true
  }

  editor.deleteBackward = unit => {
    const currentMentionInput = findMentionInput(editor)

    if (currentMentionInput && getNodeString(currentMentionInput[0]) === '') {
      removeMentionInput(editor, currentMentionInput[1])

      return moveSelection(editor, { unit: 'word' })
    }

    deleteBackward(unit)
  }

  editor.insertBreak = () => {
    if (isSelectionInMentionInput(editor)) {
      return
    }

    insertBreak()
  }

  editor.insertText = text => {
    if (
      !editor.selection ||
      text !== trigger ||
      (query && !query(editor as PlateEditor)) ||
      isSelectionInMentionInput(editor)
    ) {
      return insertText(text)
    }

    // Make sure a mention input is created at the beginning of line or after a whitespace
    const previousChar = getEditorString(
      editor,
      getRange(editor, editor.selection, getPointBefore(editor, editor.selection))
    )
    const matchesPreviousCharPattern = triggerPreviousCharPattern?.test(previousChar)

    if (matchesPreviousCharPattern && text === trigger) {
      const data: TMentionInputElement = {
        children: [{ text: '' }],
        trigger,
        type
      }

      if (inputCreation) {
        data[inputCreation.key] = inputCreation.value
      }

      return insertNode(data)
    }

    return insertText(text)
  }

  editor.apply = operation => {
    apply(operation)

    if (operation.type === 'insert_text' || operation.type === 'remove_text') {
      const currentMentionInput = findMentionInput(editor)

      if (currentMentionInput) {
        comboboxActions.text(getNodeString(currentMentionInput[0]))
      }
    } else if (operation.type === 'set_selection') {
      const previousMentionInputPath = Range.isRange(operation.properties)
        ? findMentionInput(editor, { at: operation.properties })?.[1]
        : undefined

      const currentMentionInputPath = Range.isRange(operation.newProperties)
        ? findMentionInput(editor, { at: operation.newProperties })?.[1]
        : undefined

      if (previousMentionInputPath && !currentMentionInputPath) {
        removeMentionInput(editor, previousMentionInputPath)
        moveSelection(editor, { unit: 'word' })
      }
      if (currentMentionInputPath) {
        comboboxActions.targetRange(editor.selection)
      }
    } else if (operation.type === 'insert_node' && isNodeMentionInput(editor, operation.node as TNode)) {
      if ((operation.node as TMentionInputElement).trigger !== trigger) {
        return
      }

      const text = ((operation.node as TMentionInputElement).children as TText[])[0]?.text ?? ''

      if (inputCreation === undefined || operation.node[inputCreation.key] === inputCreation.value) {
        // Needed for undo - after an undo a mention insert we only receive
        // an insert_node with the mention input, i.e. nothing indicating that it
        // was an undo.
        setSelection(editor, {
          anchor: { offset: text.length, path: operation.path.concat([0]) },
          focus: { offset: text.length, path: operation.path.concat([0]) }
        })

        comboboxActions.open({
          activeId: id!,
          targetRange: editor.selection,
          text
        })
      }
    } else if (operation.type === 'remove_node' && isNodeMentionInput(editor, operation.node as TNode)) {
      if ((operation.node as TMentionInputElement).trigger !== trigger) {
        return
      }

      comboboxActions.reset()
    }
  }

  return editor
}
