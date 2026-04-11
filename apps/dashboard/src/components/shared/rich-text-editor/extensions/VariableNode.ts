import { Node as TiptapNode, mergeAttributes } from '@tiptap/core';

/**
 * VariableNode — An inline, atomic, non-editable node that represents a
 * template variable like {{businessName}}. Adapted from the ivy-tutors
 * HotText extension pattern.
 *
 * Renders as: <span data-variable="name" class="variable-badge" contenteditable="false">{{name}}</span>
 */
export const VariableNode = TiptapNode.create({
  name: 'variable',
  group: 'inline',
  inline: true,
  atom: true, // Non-editable, treated as a single unit

  addAttributes() {
    return {
      name: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-variable') ?? '',
        renderHTML: (attributes) => ({ 'data-variable': attributes.name }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-variable]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'variable-badge',
        contenteditable: 'false',
      }),
      `{{${HTMLAttributes['data-variable'] ?? ''}}}`,
    ];
  },

  addCommands() {
    return {
      insertVariable: (name: string) => ({ chain }) => {
        return chain()
          .insertContent({
            type: this.name,
            attrs: { name },
          })
          .insertContent(' ') // Add space after for easier typing
          .run();
      },
    };
  },
});

export default VariableNode;
