import { describe, expect, it } from "bun:test";
import { parseMessage } from './messageParser';

describe('parseMessage', () => {
  it('should parse a simple text message', () => {
    const input = 'Hello world';
    const result = parseMessage(input);
    expect(result).toEqual([
      { type: 'text', content: 'Hello world' }
    ]);
  });

  it('should parse a message with thinking section', () => {
    const input = 'Hello\n<antThinking>Some thoughts</antThinking>\nWorld';
    const result = parseMessage(input);
    expect(result).toEqual([
      { type: 'text', content: 'Hello' },
      { type: 'thinking', content: 'Some thoughts' },
      { type: 'text', content: 'World' }
    ]);
  });

  it('should parse a message with artifact section', () => {
    const input = 'Start\n<antArtifact identifier="test" type="react" title="Test">code here</antArtifact>\nEnd';
    const result = parseMessage(input);
    expect(result).toEqual([
      { type: 'text', content: 'Start' },
      {
        type: 'artifact',
        identifier: 'test',
        artifactType: 'react',
        title: 'Test',
        content: 'code here'
      },
      { type: 'text', content: 'End' }
    ]);
  });

  it('should handle multiple segments of all types', () => {
    const input = `Hello
<antThinking>Thought 1</antThinking>
Middle
<antArtifact identifier="id1" type="react" title="Title 1">code 1</antArtifact>
<antThinking>Thought 2</antThinking>
End`;

    const result = parseMessage(input);
    expect(result).toEqual([
      { type: 'text', content: 'Hello' },
      { type: 'thinking', content: 'Thought 1' },
      { type: 'text', content: 'Middle' },
      {
        type: 'artifact',
        identifier: 'id1',
        artifactType: 'react',
        title: 'Title 1',
        content: 'code 1'
      },
      { type: 'thinking', content: 'Thought 2' },
      { type: 'text', content: 'End' }
    ]);
  });

  it('should parse code blocks with and without languages', () => {
    const input = `Before
\`\`\`javascript
console.log('hello');
\`\`\`
Middle
\`\`\`
No language here
\`\`\`
After`;

    const result = parseMessage(input);
    expect(result).toEqual([
      { type: 'text', content: 'Before' },
      { 
        type: 'code', 
        language: 'javascript', 
        path: undefined,
        content: 'console.log(\'hello\');' 
      },
      { type: 'text', content: 'Middle' },
      { 
        type: 'code', 
        language: 'text', 
        path: undefined,
        content: 'No language here' 
      },
      { type: 'text', content: 'After' }
    ]);
  });
});
