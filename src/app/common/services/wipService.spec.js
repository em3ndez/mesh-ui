describe('wipService', function() {

    var wipService,
        itemType,
        testItem;

    beforeEach(module('meshAdminUi.common.wipService', 'meshAdminUi.common'));
    beforeEach(inject(function (_wipService_) {
        wipService = _wipService_;
        wipService.clearLocal();
        testItem = {
            uuid: 'some_uuid',
            name: 'Item One'
        };
        itemType = 'testType';
    }));

    it('should be initially empty.', function() {
        expect(wipService.getOpenItems(itemType)).toEqual([]);
    });

    it('should add an item to the store with openItem()', function() {
        wipService.openItem(itemType, testItem);

        var openItems = wipService.getOpenItems(itemType);

        expect(openItems.length).toBe(1);
        expect(openItems[0].item.name).toEqual(testItem.name);
    });

    it('should store metadata if passed to openItem()', function() {
        var myMetadata = { foo: 'bar' };
        wipService.openItem(itemType, testItem, myMetadata);

        expect(wipService.getMetadata(itemType, testItem.uuid)).toEqual(myMetadata);
    });

    it('should add new metadata with setMetadata()', function() {
        wipService.openItem(itemType, testItem);
        wipService.setMetadata(itemType, testItem.uuid, 'quux', 'bax');

        expect(wipService.getMetadata(itemType, testItem.uuid)).toEqual({ quux: 'bax'});
    });

    it('should modify existing metadata with setMetadata()', function() {
        wipService.openItem(itemType, testItem, { foo: 'bar' });
        wipService.setMetadata(itemType, testItem.uuid, 'foo', 'fubar');

        expect(wipService.getMetadata(itemType, testItem.uuid)).toEqual({ foo: 'fubar'});
    });

    it('should remove the item from the store with closeItem()', function() {
        wipService.openItem(itemType, testItem);
        wipService.closeItem(itemType, testItem);

        expect(wipService.getOpenItems(itemType)).toEqual([]);
    });

    it('should return a specific item with getItem()', function() {
        wipService.openItem(itemType, testItem);

        expect(wipService.getItem(itemType, testItem.uuid)).toBe(testItem);
    });

    it('should return undefined with getItem() if uuid not found', function() {
        wipService.openItem(itemType, testItem);

        expect(wipService.getItem(itemType, 'nonExistentId')).toBeUndefined();
    });

    it('isOpen() should give correct result', function() {
        expect(wipService.isOpen(itemType, testItem.uuid)).toBe(false);
        wipService.openItem(itemType, testItem);
        expect(wipService.isOpen(itemType, testItem.uuid)).toBe(true);
    });

    it('updateItem() should merge new fields into existing item', function() {
        wipService.openItem(itemType, testItem);
        wipService.updateItem(itemType, {
            uuid: 'some_uuid',
            name: 'Item One Modified'
        });

        expect(wipService.getItem(itemType, testItem.uuid).name).toBe('Item One Modified');
    });

    it('updateItem() should preserve the object reference', function() {
        wipService.openItem(itemType, testItem);
        wipService.updateItem(itemType, {
            uuid: 'some_uuid',
            name: 'Item One Modified'
        });

        var modifiedItem = wipService.getItem(itemType, testItem.uuid);
        expect(modifiedItem === testItem).toBe(true);
    });

    it('updateItem() should throw if item uuid does not match', function() {
        wipService.openItem(itemType, testItem);

        function doUpdate() {
            wipService.updateItem(itemType, {
                uuid: 'bad_uuid',
                name: 'Item One Modified'
            });
        }

        expect(doUpdate).toThrow();
    });

    describe('change tracking', function() {

        beforeEach(function() {
            wipService.openItem(itemType, testItem);
        });

        it('should mark item as modified with setAsModified()', function() {
            expect(wipService.isModified(itemType, testItem)).toBe(false);
            wipService.setAsModified(itemType, testItem);
            expect(wipService.isModified(itemType, testItem)).toBe(true);
        });

        it('should mark item as unmodified with setAsUnmodified()', function() {
            wipService.setAsModified(itemType, testItem);
            expect(wipService.isModified(itemType, testItem)).toBe(true);
            wipService.setAsUnmodified(itemType, testItem);
            expect(wipService.isModified(itemType, testItem)).toBe(false);
        });

        it('should not alter the original item when marking as modified', function() {
            var original = angular.copy(testItem);
            wipService.setAsModified(itemType, testItem);

            expect(testItem).toEqual(original);
        });

        it('should list all modified with getModifiedItems()', function() {
            var secondItem = {
                uuid: 'foobar'
            };
            wipService.openItem(itemType, secondItem);

            wipService.setAsModified(itemType, testItem);
            expect(wipService.getModifiedItems(itemType)).toEqual([testItem.uuid]);

            wipService.setAsModified(itemType, secondItem);
            expect(wipService.getModifiedItems(itemType)).toEqual([testItem.uuid, secondItem.uuid]);

        });

        it('should correctly list modified items after setting to unmodified', function() {
            wipService.setAsModified(itemType, testItem);
            wipService.setAsUnmodified(itemType, testItem);

            expect(wipService.getModifiedItems(itemType)).toEqual([]);
        });

        it('should remove an item from modified list if close with closeItem()', function() {
            wipService.setAsModified(itemType, testItem);
            wipService.closeItem(itemType, testItem);
            expect(wipService.getModifiedItems(itemType)).toEqual([]);
        });
    });

    describe('exceptional input', function() {

        it('should warn if item uuid already exists with openItem()', function() {
            spyOn(console, 'warn');
            wipService.openItem(itemType, testItem);
            wipService.openItem(itemType, testItem);

            expect(console.warn).toHaveBeenCalled();
        });

        it('should throw if item has no uuid on openItem()', function() {
            function addBadItem() {
                wipService.openItem(itemType, { foo: 'bar'});
            }

            expect(addBadItem).toThrow();
        });

        it('should throw if attempting to modify non-existent item', function() {
            function closeItem() { wipService.closeItem(itemType, testItem); }
            function setAsModified() { wipService.setAsModified(itemType, testItem); }
            function setAsUnmodified() { wipService.setAsUnmodified(itemType, testItem); }
            function isModified() { wipService.isModified(itemType, testItem); }

            expect(closeItem).toThrow();
            expect(setAsModified).toThrow();
            expect(setAsUnmodified).toThrow();
            expect(isModified).toThrow();
        });
    });

    describe('local storage', function() {

        var otherItem =  { name: 'foo', uuid: 'bar'};

        beforeAll(function() {
            wipService.clearLocal();
            wipService.openItem(itemType, testItem);
            wipService.persistLocal();
        });

        it('should be populated with previously-opened item.', function() {
            expect(wipService.getOpenItems(itemType)[0].item).toEqual(testItem);

            wipService.openItem(itemType, otherItem);
            wipService.persistLocal();
        });

        it('should accrue subsequent changes', function() {
            expect(wipService.getOpenItems(itemType)[1].item.name).toEqual(otherItem.name);

            wipService.setAsModified(itemType, otherItem);
            wipService.persistLocal();
        });

        it('should persist modified items', function() {
            expect(wipService.getModifiedItems(itemType)).toEqual([otherItem.uuid]);
        });

        afterAll(function() {
            wipService.clearLocal();
        });
    });
});