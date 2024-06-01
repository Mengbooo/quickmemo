import { Plate } from '@udecode/plate-common'
import { Editor } from '@/components/ui/editor'
import { plugins } from './plugins'
import { TooltipProvider } from '@/components/ui/tooltip'
import { UploadImageProvider } from '@/context/uploadContext'
import { SelectedTagsProvider } from '@/context/SelectedTagsContext'

interface EditorProps {
  id: string
  type: string
  children: {
    text: string
  }[]
}

const initialValue = [
  {
    id: '1',
    type: 'p',
    children: [{ text: 'Hello, World!' }]
  }
]

// const MENTIONABLES: TComboboxItemWithData<any>[] = [{ key: '0', text: 'Aayla Secura', data: 'https://' }]

export default function PlateEditor() {
  return (
    <div>
      <SelectedTagsProvider>
        <UploadImageProvider>
          <div className='relative top-0'>
            <TooltipProvider>
              <Plate plugins={plugins}>
                <Editor placeholder='Typing something here...' />
                {/* <MentionCombobox items={MENTIONABLES} /> */}
                {/* <div className='w-full mt-4'><TagSelect/></div> */}
              </Plate>
            </TooltipProvider>
          </div>
        </UploadImageProvider>
      </SelectedTagsProvider>
    </div>
  )
}
