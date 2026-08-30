import { PDFDocument, PDFName, PDFString, PDFNumber, PDFRef, rgb } from 'pdf-lib';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function makePdf({ title = 'Source', links = false, named = false, bookmarks = false, form = false, fieldName = 'customer', metadata = true, feature, labels = false, group = false, inherited = false, objectStreams = false, formExtras = false, danglingCatalog } = {}) {
  const pdf = await PDFDocument.create({ updateMetadata: false });
  if (metadata) {
    pdf.setTitle(title); pdf.setAuthor('Synthetic author'); pdf.setCreationDate(new Date('2020-01-01T00:00:00Z'));
    pdf.context.lookup(pdf.context.trailerInfo.Info).set(PDFName.of('CustomField'), PDFString.of('keep-custom'));
    const xmp = pdf.context.stream('<metadata>synthetic XMP</metadata>', { Type: 'Metadata', Subtype: 'XML' });
    pdf.catalog.set(PDFName.of('Metadata'), pdf.context.register(xmp));
  }
  const pages = Array.from({length:3}, (_,i) => {
    const page = pdf.addPage([320,240]); page.drawText(`PAGE ${i+1} - ${title}`,{x:30,y:190,size:16});
    page.drawRectangle({x:30+20*i,y:30,width:60,height:45,color:rgb(i/3,0.4,0.8)}); return page;
  });
  const dest = pdf.context.obj([pages[2].ref, PDFName.of('Fit')]);
  if (group) pages[0].node.set(PDFName.of('Group'),pdf.context.obj({Type:'Group',S:'Transparency',CS:'DeviceRGB',I:true}));
  if (labels) pdf.catalog.set(PDFName.of('PageLabels'),pdf.context.obj({Nums:[0,{S:'r',P:PDFString.of('Front-'),St:3},2,{S:'D',St:5}]}));
  if (inherited) {
    const parent=pdf.context.lookup(pages[0].node.get(PDFName.of('Parent')));
    parent.set(PDFName.of('MediaBox'),pdf.context.obj([0,0,320.123456789,240.987654321]));
    parent.set(PDFName.of('Resources'),pages[0].node.get(PDFName.of('Resources')));
    parent.set(PDFName.of('Rotate'),PDFNumber.of(90));
    for(const page of pages) { page.node.delete(PDFName.of('MediaBox')); page.node.delete(PDFName.of('Rotate')); }
    pages[0].node.delete(PDFName.of('Resources'));
  }
  if (named) pdf.catalog.set(PDFName.of('Names'), pdf.context.obj({ Dests: { Names: [PDFString.of('last-page'), dest] } }));
  if (links) {
    const uri = pdf.context.register(pdf.context.obj({ Type:'Annot',Subtype:'Link',Rect:[20,120,160,145],Border:[0,0,1],P:pages[0].ref,A:{S:'URI',URI:PDFString.of('https://example.com/')} }));
    const local = pdf.context.register(pdf.context.obj({ Type:'Annot',Subtype:'Link',Rect:[20,90,160,115],Border:[0,0,1],P:pages[0].ref,Dest:named ? PDFString.of('last-page') : dest }));
    pages[0].node.set(PDFName.of('Annots'), pdf.context.obj([uri,local]));
  }
  if (bookmarks) {
    const root = pdf.context.obj({Type:'Outlines'}), rootRef=pdf.context.register(root);
    const first=pdf.context.obj({Title:PDFString.of('First'),Parent:rootRef,Dest:[pages[0].ref,PDFName.of('Fit')]}), firstRef=pdf.context.register(first);
    const last=pdf.context.obj({Title:PDFString.of('Last'),Parent:rootRef,Dest:named ? PDFString.of('last-page') : dest}), lastRef=pdf.context.register(last);
    first.set(PDFName.of('Next'),lastRef); last.set(PDFName.of('Prev'),firstRef);
    root.set(PDFName.of('First'),firstRef); root.set(PDFName.of('Last'),lastRef); root.set(PDFName.of('Count'),PDFNumber.of(2));
    pdf.catalog.set(PDFName.of('Outlines'),rootRef);
  }
  if (form) {
    const field=pdf.getForm().createTextField(fieldName); field.setText('Editable value'); field.addToPage(pages[0],{x:20,y:70,width:200,height:30});
    const check=pdf.getForm().createCheckBox(fieldName+'-checked');check.addToPage(pages[0],{x:240,y:70,width:20,height:20});check.check();
    pdf.getForm().updateFieldAppearances();
  }
  if (formExtras) {
    const form=pdf.getForm(),choice=form.createDropdown('choice');choice.addOptions(['Alpha','Beta']);choice.select('Beta');choice.addToPage(pages[1],{x:20,y:60,width:200,height:30});
    const radio=form.createRadioGroup('radio');radio.addOptionToPage('one',pages[0],{x:220,y:50,width:15,height:15});radio.addOptionToPage('two',pages[2],{x:220,y:50,width:15,height:15});radio.select('two');
    form.updateFieldAppearances();
  }
  if (feature==='tagged') {
    pdf.catalog.set(PDFName.of('StructTreeRoot'),pdf.context.obj({Type:'StructTreeRoot'}));
    pdf.catalog.set(PDFName.of('MarkInfo'),pdf.context.obj({Marked:true}));
    pages[0].node.set(PDFName.of('StructParents'),PDFNumber.of(0));
    pages[0].node.set(PDFName.of('Tabs'),PDFName.of('S'));
  }
  if (feature==='layers') pdf.catalog.set(PDFName.of('OCProperties'),pdf.context.obj({OCGs:[],D:{}}));
  if (feature==='script') pdf.catalog.set(PDFName.of('OpenAction'),pdf.context.obj({S:'JavaScript',JS:PDFString.of('alert(1)')}));
  if (feature==='signature') pdf.catalog.set(PDFName.of('Perms'),pdf.context.obj({DocMDP:{Type:'Sig'}}));
  if (feature==='attachment') await pdf.attach(new Uint8Array([1,2,3]),'fixture.bin');
  if (feature==='xfa') {pdf.getForm();pdf.catalog.lookup(PDFName.of('AcroForm')).set(PDFName.of('XFA'),PDFString.of('test'));}
  if (danglingCatalog) pdf.catalog.set(PDFName.of(danglingCatalog),PDFRef.of(999,0));
  return pdf.save({useObjectStreams:objectStreams, updateFieldAppearances:false});
}

export async function writeFixtures(directory) {
  await mkdir(directory,{recursive:true});
  const fixtures={plain:{},other:{title:'Different title'},links:{links:true,named:true},bookmarks:{bookmarks:true,named:true},form:{form:true},'form-other':{form:true,fieldName:'other'},combined:{links:true,named:true,bookmarks:true},tagged:{feature:'tagged'},layers:{feature:'layers'},script:{feature:'script'},signature:{feature:'signature'},attachment:{feature:'attachment'},xfa:{feature:'xfa'}};
  for(const [name,options] of Object.entries(fixtures)) await writeFile(join(directory,name+'.pdf'),await makePdf(options));
  return fixtures;
}
if(process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await writeFixtures(process.argv[2]);
