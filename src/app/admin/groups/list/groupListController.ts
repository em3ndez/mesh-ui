module meshAdminUi {

    class GroupListController {
        public groups: IUserGroup[];
        public roles: IUserRole[];
        public groupFilter: string;

        constructor(private $q: ng.IQService,
                    private $timeout: ng.ITimeoutService,
                    private notifyService: NotifyService,
                    private mu: MeshUtils,
                    private dataService: DataService) {
            $q.all([
                    // TODO: implement paging
                    dataService.getGroups({ perPage: 10000 }),
                    dataService.getRoles({ perPage: 10000 })
                ])
                .then((dataArray: any[]) => {
                    this.groups = dataArray[0].data;
                    this.roles = dataArray[1].data;
                });
        }

        public filterFn = (value: IUser) => {
            return this.mu.matchProps(value, ['name'], this.groupFilter);
        };

        public validateRole(role, group: IUserGroup) {
            // TODO: group.roles will be a noderef rather than a string.
            var groupAlreadyHasRole = group.roles.map(role => role).indexOf(role.name) > -1;

            if (groupAlreadyHasRole || !role.name) {
                this.notifyService.toast('GROUP_ALREADY_ASSIGNED_TO_ROLE', { name: role.name });
                this.$timeout(() => group.roles = group.roles.filter(role => typeof role !== 'undefined'));
            } else {
                this.dataService.addGroupToRole(group.uuid, role.uuid)
                    .then(() => this.notifyService.toast('GROUP_ADDED_TO_ROLE', { groupName: group.name, roleName: role.name }));
                return role;
            }
        }

        public removeRole(role, group: IUserGroup) {
            this.dataService.removeGroupFromRole(group.uuid, role.uuid)
                .then(() => this.notifyService.toast('GROUP_REMOVED_FROM_ROLE', { groupName: group.name, roleName: role.name }));
        }

        public displayChipName(chip: any) {
            return (chip && chip.name) ? chip.name : chip;
        }

        /**
         * Search for thing.
         */
        public filterBy(collection, query) {
            return query ? collection.filter(this.createFilterFor(query)) : [];
        }

        /**
         * Create filter function for a query string
         */
        private createFilterFor(query) {
            var lowercaseQuery = angular.lowercase(query);
            return item => item.name.toLowerCase().indexOf(lowercaseQuery) === 0;
        }
    }

    angular.module('meshAdminUi.admin')
        .controller('GroupListController', GroupListController);

}