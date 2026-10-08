/* Ported from Frontend/src/modules/Food/pages/admin/settings/Gallery.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { Folder, Plus, ArrowLeft, HardDrive, File, Image, Trash2 } from 'lucide-react-native';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/shadcn';
import { Button, Div, Input, ScrollDiv, Span, Icon as UiIcon } from '../../../../components/web';
import { AdminPage, PageHeader, Card, SectionTitle, Toolbar, Field, EmptyState, INPUT, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY, useLayoutWidth } from '../../../../admin/ui';
import { pickDocument } from '../../../../lib/files';
import { alert } from '../../../../lib/webShim';
export default function Gallery() {
  const [currentPath, setCurrentPath] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // File system structure
  const [fileSystem, setFileSystem] = useState({
    Profile: {
      type: 'folder',
      items: [],
    },
    React_head: {
      type: 'folder',
      items: [],
    },
    About_us_i: {
      type: 'folder',
      items: [],
    },
    React_prom: {
      type: 'folder',
      items: [],
    },
    Reviewer_i: {
      type: 'folder',
      items: [],
    },
    React_gall: {
      type: 'folder',
      items: [],
    },
    React_down: {
      type: 'folder',
      items: [],
    },
    Product: {
      type: 'folder',
      items: [],
    },
    Payment_mo: {
      type: 'folder',
      items: [],
    },
    Advertisem: {
      type: 'folder',
      items: [],
    },
    React_land: {
      type: 'folder',
      items: [],
    },
    Header_ima: {
      type: 'folder',
      items: [],
    },
    'Delivery-M': {
      type: 'folder',
      items: [],
    },
    Vendor: {
      type: 'folder',
      items: [],
    },
    Cuisine: {
      type: 'folder',
      items: [],
    },
    Opportunit: {
      type: 'folder',
      items: [],
    },
    Admin: {
      type: 'folder',
      items: [],
    },
    Landing: {
      type: 'folder',
      items: [],
    },
    React_rest: {
      type: 'folder',
      items: [],
    },
    Restaurant: {
      type: 'folder',
      items: [],
    },
    Page_meta_: {
      type: 'folder',
      items: [],
    },
    Campaign: {
      type: 'folder',
      items: [],
    },
    React_serv: {
      type: 'folder',
      items: [],
    },
    Category: {
      type: 'folder',
      items: [],
    },
    Hero_image: {
      type: 'folder',
      items: [],
    },
    Conversati: {
      type: 'folder',
      items: [],
    },
    Meta_image: {
      type: 'folder',
      items: [],
    },
    Business: {
      type: 'folder',
      items: [],
    },
    Notificati: {
      type: 'folder',
      items: [],
    },
    Meta_data_: {
      type: 'folder',
      items: [],
    },
    React_deli: {
      type: 'folder',
      items: [],
    },
    Why_choose: {
      type: 'folder',
      items: [],
    },
    Email_temp: {
      type: 'folder',
      items: [],
    },
    Banner: {
      type: 'folder',
      items: [],
    },
    Available_: {
      type: 'folder',
      items: [],
    },
    React_step: {
      type: 'folder',
      items: [],
    },
    Feature_im: {
      type: 'folder',
      items: [],
    },
    Step_image: {
      type: 'folder',
      items: [],
    },
    Earn_money: {
      type: 'folder',
      items: [],
    },
    React_meta: {
      type: 'folder',
      items: [],
    },
  });
  const folders = Object.keys(fileSystem);
  const filteredFolders = folders.filter((folder) => folder.toLowerCase().includes(searchQuery.toLowerCase()));
  const handleFolderClick = (folderName) => {
    setCurrentPath(folderName);
  };
  const handleBack = () => {
    setCurrentPath('');
  };
  const handleFileSelect = async () => {
    const files = await pickDocument({ multiple: true });
    if (!files.length) return;
    setSelectedFiles(files);
    setIsUploadDialogOpen(true);
  };
  const handleUpload = () => {
    if (selectedFiles.length === 0) {
      alert('Please select files to upload');
      return;
    }
    const targetFolder = currentPath || 'root';
    const newFiles = selectedFiles.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    }));
    setFileSystem((prev) => ({
      ...prev,
      [targetFolder]: {
        ...prev[targetFolder],
        items: [...(prev[targetFolder]?.items || []), ...newFiles],
      },
    }));
    alert(`${selectedFiles.length} file(s) uploaded successfully!`);
    setSelectedFiles([]);
    setIsUploadDialogOpen(false);
  };
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      alert('Please enter a folder name');
      return;
    }
    const folderName = newFolderName.trim();
    if (fileSystem[folderName]) {
      alert('Folder already exists');
      return;
    }
    setFileSystem((prev) => ({
      ...prev,
      [folderName]: {
        type: 'folder',
        items: [],
      },
    }));
    setNewFolderName('');
    setIsFolderDialogOpen(false);
    alert(`Folder "${folderName}" created successfully!`);
  };
  const handleDeleteFolder = async (folderName) => {
    if (await window.confirmAsync(`Are you sure you want to delete "${folderName}"?`)) {
      setFileSystem((prev) => {
        const newSystem = {
          ...prev,
        };
        delete newSystem[folderName];
        return newSystem;
      });
      if (currentPath === folderName) {
        setCurrentPath('');
      }
    }
  };
  const currentFolderItems = currentPath ? fileSystem[currentPath]?.items || [] : [];
  const { width, tablet, wide } = useLayoutWidth();
  // Tiles wrap instead of being squeezed into eight columns on a phone.
  const tileColumns = wide ? 6 : tablet ? 4 : 3;
  const tileWidth = Math.floor(((tablet ? Math.min(width, 1200) : width) - 32 - 32 - (tileColumns - 1) * 12) / tileColumns);
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Folder}
        title="File manager"
        subtitle="Folders and uploads used across the storefront and app."
        breadcrumb={currentPath ? [{ label: 'Food' }, { label: 'Gallery' }, { label: currentPath }] : [{ label: 'Food' }, { label: 'Gallery' }]}
        actions={
          <>
            <Button onClick={handleFileSelect} className={BTN_PRIMARY} accessibilityLabel="Add new files">
              <UiIcon as={Plus} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Add new</Span>
            </Button>
            <Button onClick={() => setIsFolderDialogOpen(true)} className={BTN_SECONDARY} accessibilityLabel="Create a new folder">
              <UiIcon as={Folder} size={16} className="text-slate-700" />
              <Span className={BTN_TEXT_SECONDARY}>New folder</Span>
            </Button>
            {currentPath ? (
              <Button onClick={handleBack} className={BTN_SECONDARY} accessibilityLabel="Back to all folders">
                <UiIcon as={ArrowLeft} size={16} className="text-slate-700" />
                <Span className={BTN_TEXT_SECONDARY}>Back</Span>
              </Button>
            ) : null}
          </>
        }
      />

      <Card className="mb-4">
        <SectionTitle
          action={
            <Div className="flex-row items-center gap-2">
              <UiIcon as={HardDrive} size={16} className="text-slate-500" />
              <Span className="text-xs text-slate-500">{folders.length} folders</Span>
            </Div>
          }
        >
          Local storage
        </SectionTitle>
        <Toolbar className="mb-0">
          <Input
            type="search"
            placeholder="Search folders…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${INPUT} flex-1 min-w-[180px]`}
          />
        </Toolbar>
      </Card>

      {currentPath ? (
        <Card>
          <SectionTitle>Files in {currentPath}</SectionTitle>
          {currentFolderItems.length === 0 ? (
            <EmptyState
              icon={File}
              title="This folder is empty"
              message="Upload files to keep them together here."
              actionLabel="Add new"
              onAction={handleFileSelect}
              className="border-0"
            />
          ) : (
            <Div className="flex-row flex-wrap gap-3">
              {currentFolderItems.map((file, index) => (
                <Div key={index} className="items-center gap-1.5" style={{ width: tileWidth }}>
                  <Div className="w-16 h-16 bg-blue-100 rounded-lg items-center justify-center">
                    <UiIcon as={file.type?.startsWith('image/') ? Image : File} size={28} className="text-blue-600" />
                  </Div>
                  <Span className="text-xs text-slate-700 text-center" numberOfLines={2}>
                    {file.name}
                  </Span>
                </Div>
              ))}
            </Div>
          )}
        </Card>
      ) : (
        <Card>
          <SectionTitle>Folders</SectionTitle>
          {filteredFolders.length === 0 ? (
            <EmptyState
              icon={Folder}
              title={searchQuery ? 'No folder matches that search' : 'No folders yet'}
              message={searchQuery ? `Nothing is named like “${searchQuery}”.` : 'Create a folder to organise uploads.'}
              actionLabel={searchQuery ? 'Clear search' : 'New folder'}
              onAction={searchQuery ? () => setSearchQuery('') : () => setIsFolderDialogOpen(true)}
              className="border-0"
            />
          ) : (
            <Div className="flex-row flex-wrap gap-3">
              {filteredFolders.map((folder, index) => (
                <Div key={index} className="items-center gap-1.5" style={{ width: tileWidth }}>
                  <Div
                    onClick={() => handleFolderClick(folder)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open folder ${folder}`}
                    className="w-16 h-16 bg-yellow-100 rounded-lg items-center justify-center"
                  >
                    <UiIcon as={Folder} size={28} className="text-yellow-600" />
                  </Div>
                  <Span className="text-xs text-slate-700 text-center" numberOfLines={2}>
                    {folder}
                  </Span>
                  <Button
                    onClick={() => handleDeleteFolder(folder)}
                    accessibilityLabel={`Delete folder ${folder}`}
                    className="w-11 h-11 items-center justify-center rounded-lg"
                  >
                    <UiIcon as={Trash2} size={16} className="text-red-600" />
                  </Button>
                </Div>
              ))}
            </Div>
          )}
        </Card>
      )}

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Upload files</DialogTitle>
          </DialogHeader>
          <Div className="gap-3">
            <Span className="text-sm text-slate-500">{selectedFiles.length} file(s) selected</Span>
            <ScrollDiv style={{ maxHeight: 200 }} contentClassName="gap-1.5">
              {selectedFiles.map((file, index) => (
                <Div key={index} className="rounded-lg bg-slate-100 px-3 py-2">
                  <Span className="text-xs text-slate-700">
                    {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </Span>
                </Div>
              ))}
            </ScrollDiv>
            <Div className="flex-row justify-end gap-2">
              <Button
                onClick={() => {
                  setIsUploadDialogOpen(false);
                  setSelectedFiles([]);
                }}
                className={BTN_SECONDARY}
                accessibilityLabel="Cancel the upload"
              >
                <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
              </Button>
              <Button onClick={handleUpload} className={BTN_PRIMARY} accessibilityLabel="Upload the selected files">
                <Span className={BTN_TEXT_PRIMARY}>Upload</Span>
              </Button>
            </Div>
          </Div>
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Create a folder</DialogTitle>
          </DialogHeader>
          <Div className="gap-3">
            <Field label="Folder name" required>
              <Input
                type="text"
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateFolder();
                  }
                }}
                className={INPUT}
              />
            </Field>
            <Div className="flex-row justify-end gap-2">
              <Button
                onClick={() => {
                  setIsFolderDialogOpen(false);
                  setNewFolderName('');
                }}
                className={BTN_SECONDARY}
                accessibilityLabel="Cancel creating a folder"
              >
                <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
              </Button>
              <Button onClick={handleCreateFolder} className={BTN_PRIMARY} accessibilityLabel="Create the folder">
                <Span className={BTN_TEXT_PRIMARY}>Create</Span>
              </Button>
            </Div>
          </Div>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
